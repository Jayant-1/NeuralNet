"""
Graph Compiler — converts JSON graph to Keras model using Python AST

Takes a topologically sorted list of layer definitions and constructs
a valid Python AST that, when compiled and executed, produces a
tf.keras Sequential model.
"""
import ast
from typing import List, Dict, Any


def topological_sort(layers: List[Dict], connections: List[Dict]) -> List[Dict]:
    """Sort layers in execution order using Kahn's algorithm."""
    adj: Dict[str, List[str]] = {l["id"]: [] for l in layers}
    in_deg: Dict[str, int] = {l["id"]: 0 for l in layers}

    for conn in connections:
        src = conn.get("source", conn.get("from", ""))
        tgt = conn.get("target", conn.get("to", ""))
        if src in adj:
            adj[src].append(tgt)
        if tgt in in_deg:
            in_deg[tgt] += 1

    queue = [lid for lid, deg in in_deg.items() if deg == 0]
    sorted_ids = []
    while queue:
        nid = queue.pop(0)
        sorted_ids.append(nid)
        for neighbor in adj.get(nid, []):
            in_deg[neighbor] -= 1
            if in_deg[neighbor] == 0:
                queue.append(neighbor)

    layer_map = {l["id"]: l for l in layers}
    return [layer_map[lid] for lid in sorted_ids if lid in layer_map]


def _build_layer_call(layer_type: str, params: Dict[str, Any]) -> ast.expr:
    """Build an AST Call node for a Keras layer."""
    keywords = []

    if layer_type == "input":
        shape_str = params.get("shape", "(28, 28, 1)")
        # keras.Input(shape=(...))
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="keras", ctx=ast.Load()),
                attr="Input",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[
                ast.keyword(
                    arg="shape",
                    value=ast.Constant(value=_parse_tuple(shape_str)),
                )
            ],
        )

    elif layer_type == "dense":
        args = [ast.Constant(value=int(params.get("units", 64)))]
        if params.get("activation"):
            keywords.append(
                ast.keyword(arg="activation", value=ast.Constant(value=params["activation"]))
            )
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="Dense",
                ctx=ast.Load(),
            ),
            args=args,
            keywords=keywords,
        )

    elif layer_type == "conv2d":
        args = [
            ast.Constant(value=int(params.get("filters", 32))),
            ast.Constant(value=_parse_tuple(params.get("kernel_size", "(3, 3)"))),
        ]
        if params.get("activation"):
            keywords.append(
                ast.keyword(arg="activation", value=ast.Constant(value=params["activation"]))
            )
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="Conv2D",
                ctx=ast.Load(),
            ),
            args=args,
            keywords=keywords,
        )

    elif layer_type == "maxpool2d":
        keywords.append(
            ast.keyword(
                arg="pool_size",
                value=ast.Constant(value=_parse_tuple(params.get("pool_size", "(2, 2)"))),
            )
        )
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="MaxPooling2D",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=keywords,
        )

    elif layer_type == "flatten":
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="Flatten",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[],
        )

    elif layer_type == "dropout":
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="Dropout",
                ctx=ast.Load(),
            ),
            args=[ast.Constant(value=float(params.get("rate", 0.25)))],
            keywords=[],
        )

    elif layer_type == "batchnorm":
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="BatchNormalization",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[],
        )

    elif layer_type == "activation":
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="Activation",
                ctx=ast.Load(),
            ),
            args=[ast.Constant(value=params.get("function", "relu"))],
            keywords=[],
        )

    elif layer_type == "lstm":
        args = [ast.Constant(value=int(params.get("units", 128)))]
        rs = params.get("return_sequences", False)
        if rs in (True, "true", "True"):
            keywords.append(
                ast.keyword(arg="return_sequences", value=ast.Constant(value=True))
            )
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="LSTM",
                ctx=ast.Load(),
            ),
            args=args,
            keywords=keywords,
        )

    elif layer_type == "embedding":
        return ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="layers", ctx=ast.Load()),
                attr="Embedding",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[
                ast.keyword(arg="input_dim", value=ast.Constant(value=int(params.get("input_dim", 10000)))),
                ast.keyword(arg="output_dim", value=ast.Constant(value=int(params.get("output_dim", 128)))),
            ],
        )

    elif layer_type == "output":
        # Output is just a marker, skip
        return None

    else:
        # Unknown layer — create a comment-like expression
        return None


def _parse_tuple(s):
    """Parse a string like '(3, 3)' into a Python tuple."""
    if isinstance(s, (tuple, list)):
        return tuple(s)
    try:
        s = str(s).strip()
        if s.startswith("(") and s.endswith(")"):
            inner = s[1:-1]
            parts = [int(x.strip()) for x in inner.split(",") if x.strip()]
            return tuple(parts)
    except (ValueError, AttributeError):
        pass
    return (3, 3)


def compile_graph_to_model(
    layers_data: List[Dict[str, Any]],
    connections: List[Dict[str, Any]],
) -> str:
    """
    Convert a JSON graph definition to Keras Python code using AST.

    Returns the generated Python source code string.
    """
    sorted_layers = topological_sort(layers_data, connections)

    # Build AST module
    module_body = []

    # import tensorflow as tf
    module_body.append(
        ast.Import(names=[ast.alias(name="tensorflow", asname="tf")])
    )
    # from tensorflow import keras
    module_body.append(
        ast.ImportFrom(
            module="tensorflow",
            names=[ast.alias(name="keras")],
            level=0,
        )
    )
    # from tensorflow.keras import layers
    module_body.append(
        ast.ImportFrom(
            module="tensorflow.keras",
            names=[ast.alias(name="layers")],
            level=0,
        )
    )

    # Build Sequential layer list
    layer_elements = []
    for layer in sorted_layers:
        ltype = layer.get("type", "")
        params = layer.get("params", {})
        call_node = _build_layer_call(ltype, params)
        if call_node is not None:
            layer_elements.append(call_node)

    # model = keras.Sequential([...])
    model_assign = ast.Assign(
        targets=[ast.Name(id="model", ctx=ast.Store())],
        value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="keras", ctx=ast.Load()),
                attr="Sequential",
                ctx=ast.Load(),
            ),
            args=[ast.List(elts=layer_elements, ctx=ast.Load())],
            keywords=[],
        ),
        lineno=0,
    )
    module_body.append(model_assign)

    # model.compile(...)
    compile_call = ast.Expr(
        value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="model", ctx=ast.Load()),
                attr="compile",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[
                ast.keyword(arg="optimizer", value=ast.Constant(value="adam")),
                ast.keyword(arg="loss", value=ast.Constant(value="categorical_crossentropy")),
                ast.keyword(
                    arg="metrics",
                    value=ast.List(
                        elts=[ast.Constant(value="accuracy")],
                        ctx=ast.Load(),
                    ),
                ),
            ],
        )
    )
    module_body.append(compile_call)

    # model.summary()
    summary_call = ast.Expr(
        value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="model", ctx=ast.Load()),
                attr="summary",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[],
        )
    )
    module_body.append(summary_call)

    # Create module and fix missing line numbers
    module = ast.Module(body=module_body, type_ignores=[])
    ast.fix_missing_locations(module)

    # Unparse AST back to source code
    source_code = ast.unparse(module)

    # Format nicely
    source_code = _format_code(source_code)

    return source_code


def _format_code(code: str) -> str:
    """Add some basic formatting to the unparsed code."""
    lines = code.split("\n")
    formatted = []
    for line in lines:
        formatted.append(line)
        # Add blank line after imports
        if line.startswith("from ") or line.startswith("import "):
            if formatted and not formatted[-1] == "":
                pass  # ast.unparse handles this
    return "\n".join(formatted)
