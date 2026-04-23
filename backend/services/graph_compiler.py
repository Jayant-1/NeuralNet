"""
Graph Compiler — converts JSON graph to Keras model using Python AST

Two modes:
  1. compile_graph_to_code()   → returns Python source code string (for display)
  2. compile_and_build_model() → exec()'s the AST, returns a live tf.keras model

Uses Python's `ast` module to build a valid AST tree, then either
unparses it to source or compiles+executes it to produce a real model.
"""
import ast
import sys
import io
from typing import List, Dict, Any, Optional, Tuple


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


def _parse_tuple(s):
    """Parse a string like '(3, 3)' into a Python tuple."""
    if isinstance(s, (tuple, list)):
        return tuple(int(x) for x in s)
    try:
        s = str(s).strip()
        if s.startswith("(") and s.endswith(")"):
            inner = s[1:-1]
            parts = [int(x.strip()) for x in inner.split(",") if x.strip()]
            return tuple(parts)
        # Single number
        return (int(s),)
    except (ValueError, AttributeError):
        pass
    return (3, 3)


def _build_layer_call(layer_type: str, params: Dict[str, Any]) -> Optional[ast.expr]:
    """Build an AST Call node for a Keras layer."""
    keywords = []

    if layer_type == "input":
        shape_str = params.get("shape", "(28, 28, 1)")
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
        if params.get("padding"):
            keywords.append(
                ast.keyword(arg="padding", value=ast.Constant(value=params["padding"]))
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
        # Output is a Dense layer with configurable units/activation
        units = int(params.get("units", 10))
        activation = params.get("activation", "softmax")
        args = [ast.Constant(value=units)]
        if activation:
            keywords.append(
                ast.keyword(arg="activation", value=ast.Constant(value=activation))
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

    else:
        return None


def _build_ast_module(
    sorted_layers: List[Dict],
    optimizer: str = "adam",
    loss: str = "categorical_crossentropy",
    learning_rate: float = 0.001,
) -> ast.Module:
    """
    Build a complete Python AST module that, when executed,
    creates a compiled tf.keras.Sequential model in variable `model`.
    """
    module_body = []

    # import tensorflow as tf
    module_body.append(
        ast.Import(names=[ast.alias(name="tensorflow", asname="tf")])
    )
    # from tensorflow import keras
    module_body.append(
        ast.ImportFrom(module="tensorflow", names=[ast.alias(name="keras")], level=0)
    )
    # from tensorflow.keras import layers
    module_body.append(
        ast.ImportFrom(module="tensorflow.keras", names=[ast.alias(name="layers")], level=0)
    )

    # Build Sequential layer list — auto-insert Flatten if needed
    SPATIAL_TYPES = {"conv2d", "maxpool2d", "conv1d", "maxpool1d"}
    DENSE_TYPES = {"dense", "output"}
    layer_elements = []
    prev_type = None

    for layer in sorted_layers:
        ltype = layer.get("type", "")
        params = layer.get("params", {})

        # Auto-insert Flatten when going from spatial → dense/output
        if prev_type in SPATIAL_TYPES and ltype in DENSE_TYPES:
            flatten_call = ast.Call(
                func=ast.Attribute(
                    value=ast.Name(id="layers", ctx=ast.Load()),
                    attr="Flatten",
                    ctx=ast.Load(),
                ),
                args=[],
                keywords=[],
            )
            layer_elements.append(flatten_call)

        call_node = _build_layer_call(ltype, params)
        if call_node is not None:
            layer_elements.append(call_node)
            prev_type = ltype

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

    # Build optimizer with learning rate:
    # optimizer_obj = keras.optimizers.Adam(learning_rate=0.001)
    optimizer_map = {
        "adam": "Adam",
        "sgd": "SGD",
        "rmsprop": "RMSprop",
        "adamw": "AdamW",
    }
    opt_class = optimizer_map.get(optimizer.lower(), "Adam")
    opt_assign = ast.Assign(
        targets=[ast.Name(id="optimizer_obj", ctx=ast.Store())],
        value=ast.Call(
            func=ast.Attribute(
                value=ast.Attribute(
                    value=ast.Name(id="keras", ctx=ast.Load()),
                    attr="optimizers",
                    ctx=ast.Load(),
                ),
                attr=opt_class,
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[
                ast.keyword(arg="learning_rate", value=ast.Constant(value=learning_rate)),
            ],
        ),
        lineno=0,
    )
    module_body.append(opt_assign)

    # model.compile(optimizer=optimizer_obj, loss=..., metrics=[...])
    compile_call = ast.Expr(
        value=ast.Call(
            func=ast.Attribute(
                value=ast.Name(id="model", ctx=ast.Load()),
                attr="compile",
                ctx=ast.Load(),
            ),
            args=[],
            keywords=[
                ast.keyword(arg="optimizer", value=ast.Name(id="optimizer_obj", ctx=ast.Load())),
                ast.keyword(arg="loss", value=ast.Constant(value=loss)),
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

    module = ast.Module(body=module_body, type_ignores=[])
    ast.fix_missing_locations(module)
    return module


def compile_graph_to_code(
    layers_data: List[Dict[str, Any]],
    connections: List[Dict[str, Any]],
    optimizer: str = "adam",
    loss: str = "categorical_crossentropy",
    learning_rate: float = 0.001,
) -> str:
    """
    Convert a JSON graph definition to Keras Python source code using AST.
    Returns the generated Python source code string (for display in UI).
    """
    sorted_layers = topological_sort(layers_data, connections)
    module = _build_ast_module(sorted_layers, optimizer, loss, learning_rate)
    source_code = ast.unparse(module)

    # Pretty-format: add newlines after imports, between sections
    lines = source_code.split("\n")
    formatted = []
    for i, line in enumerate(lines):
        formatted.append(line)
        # Add blank line after last import
        if (line.startswith("from ") or line.startswith("import ")) and \
           i + 1 < len(lines) and not lines[i + 1].startswith(("from ", "import ")):
            formatted.append("")

    return "\n".join(formatted)


# Keep old name as alias for backward compat
compile_graph_to_model = compile_graph_to_code


def compile_and_build_model(
    layers_data: List[Dict[str, Any]],
    connections: List[Dict[str, Any]],
    optimizer: str = "adam",
    loss: str = "categorical_crossentropy",
    learning_rate: float = 0.001,
) -> Tuple[Any, str]:
    """
    Compile the graph → AST → exec() → return a LIVE tf.keras model.

    Returns:
        (model, source_code) — the actual Keras model object and the source code string.

    This is the core function that makes LayerLab real:
    1. Topological sort the graph
    2. Build Python AST for a keras.Sequential model
    3. compile() the AST into bytecode
    4. exec() the bytecode to produce a live model in memory
    5. Return both the model and source code
    """
    sorted_layers = topological_sort(layers_data, connections)
    module_ast = _build_ast_module(sorted_layers, optimizer, loss, learning_rate)

    # Get source code for display
    source_code = ast.unparse(module_ast)

    # Compile AST to bytecode
    code_obj = compile(module_ast, filename="<layerlab-model>", mode="exec")

    # Execute in isolated namespace
    # Capture model.summary() output
    old_stdout = sys.stdout
    summary_buffer = io.StringIO()
    sys.stdout = summary_buffer

    namespace = {}
    try:
        exec(code_obj, namespace)
    finally:
        sys.stdout = old_stdout

    model = namespace.get("model")
    if model is None:
        raise RuntimeError("AST execution did not produce a 'model' variable")

    summary_text = summary_buffer.getvalue()

    # Pretty format the source
    lines = source_code.split("\n")
    formatted = []
    for i, line in enumerate(lines):
        formatted.append(line)
        if (line.startswith("from ") or line.startswith("import ")) and \
           i + 1 < len(lines) and not lines[i + 1].startswith(("from ", "import ")):
            formatted.append("")

    return model, "\n".join(formatted), summary_text


def get_model_input_shape(model) -> tuple:
    """Extract the input shape from a compiled Keras model."""
    try:
        # model.input_shape returns something like (None, 28, 28, 1)
        shape = model.input_shape
        if isinstance(shape, list):
            shape = shape[0]
        # Remove batch dimension
        return shape[1:]
    except Exception:
        return (28, 28, 1)


def get_model_output_shape(model) -> tuple:
    """Extract the output shape from a compiled Keras model."""
    try:
        shape = model.output_shape
        if isinstance(shape, list):
            shape = shape[0]
        return shape[1:]
    except Exception:
        return (10,)
