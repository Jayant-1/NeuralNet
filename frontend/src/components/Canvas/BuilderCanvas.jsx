import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Hand, Keyboard, MousePointer2 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBuilderStore } from "../../store/store";
import CustomNode from "./CustomNode";

const nodeTypes = { custom: CustomNode };

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: "#00F2FF", strokeWidth: 2 },
};

const SNAP_GRID = [20, 20];

const BuilderCanvasContent = ({ onGraphChange }) => {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useBuilderStore((s) => s.nodes);
  const edges = useBuilderStore((s) => s.edges);
  const setStoreNodes = useBuilderStore((s) => s.setNodes);
  const setStoreEdges = useBuilderStore((s) => s.setEdges);
  const setSelectedNode = useBuilderStore((s) => s.setSelectedNode);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const copySelectedNodes = useBuilderStore((s) => s.copySelectedNodes);
  const pasteClipboard = useBuilderStore((s) => s.pasteClipboard);
  const duplicateNodes = useBuilderStore((s) => s.duplicateNodes);
  const _pushHistory = useBuilderStore((s) => s._pushHistory);
  const activeTool = useBuilderStore((s) => s.activeTool);
  const setActiveTool = useBuilderStore((s) => s.setActiveTool);

  // Space-bar held = temporary hand mode (Figma-style)
  const [spaceHeld, setSpaceHeld] = useState(false);
  const isHandMode = activeTool === "hand" || spaceHeld;

  const enableNativeCanvasCursor = useCallback(() => {
    document.body.classList.add("canvas-native-cursor");
  }, []);

  const disableNativeCanvasCursor = useCallback(() => {
    document.body.classList.remove("canvas-native-cursor");
  }, []);

  const notifyChange = useCallback(
    (newNodes, newEdges) => {
      if (onGraphChange) onGraphChange(newNodes, newEdges);
    },
    [onGraphChange],
  );

  const onNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, nodes);
      setStoreNodes(updated);
    },
    [nodes, setStoreNodes],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, edges);
      setStoreEdges(updated);
    },
    [edges, setStoreEdges],
  );

  const onConnect = useCallback(
    (params) => {
      _pushHistory();
      const newEdges = addEdge(
        {
          ...params,
          animated: true,
          style: { stroke: "#00F2FF", strokeWidth: 2 },
        },
        edges,
      );
      setStoreEdges(newEdges);
      notifyChange(nodes, newEdges);
    },
    [nodes, edges, setStoreEdges, notifyChange, _pushHistory],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const typeData = event.dataTransfer.getData("application/reactflow");
      if (!typeData) return;

      let parsedData;
      try {
        parsedData = JSON.parse(typeData);
      } catch {
        return;
      }

      // Calculate position relative to the react flow pane
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Snap to grid
      position.x = Math.round(position.x / SNAP_GRID[0]) * SNAP_GRID[0];
      position.y = Math.round(position.y / SNAP_GRID[1]) * SNAP_GRID[1];

      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: "custom",
        position,
        data: {
          type: parsedData.type,
          label: parsedData.label,
          params: parsedData.defaultParams || {},
        },
      };

      _pushHistory();
      const newNodes = [...nodes, newNode];
      setStoreNodes(newNodes);
      notifyChange(newNodes, edges);
    },
    [
      nodes,
      edges,
      setStoreNodes,
      notifyChange,
      screenToFlowPosition,
      _pushHistory,
    ],
  );

  const onNodeClick = useCallback(
    (_event, node) => {
      setSelectedNode(node);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onNodesDelete = useCallback(
    (deleted) => {
      _pushHistory();
      const deletedIds = new Set(deleted.map((n) => n.id));
      const newNodes = nodes.filter((n) => !deletedIds.has(n.id));
      const newEdges = edges.filter(
        (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target),
      );
      setStoreNodes(newNodes);
      setStoreEdges(newEdges);
      notifyChange(newNodes, newEdges);
    },
    [nodes, edges, setStoreNodes, setStoreEdges, notifyChange, _pushHistory],
  );

  const onNodeDragStop = useCallback(() => {
    _pushHistory();
  }, [_pushHistory]);

  // Keyboard shortcuts + Space for temporary hand mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      // Don't capture when typing in inputs
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )
        return;

      // Space = temporary hand mode
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
        return;
      }

      // H = hand tool, V = select tool
      if (e.key === "h" || e.key === "H") {
        setActiveTool("hand");
        return;
      }
      if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
        return;
      }
      if (e.key === "Escape") {
        setSelectedNode(null);
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((isMod && e.key === "z" && e.shiftKey) || (isMod && e.key === "y")) {
        e.preventDefault();
        redo();
      }
      if (isMod && e.key === "c") {
        const selected = nodes.filter((n) => n.selected).map((n) => n.id);
        if (selected.length > 0) {
          e.preventDefault();
          copySelectedNodes(selected);
        }
      }
      if (isMod && e.key === "v") {
        e.preventDefault();
        pasteClipboard();
      }
      if (isMod && e.key === "d") {
        e.preventDefault();
        const selected = nodes.filter((n) => n.selected).map((n) => n.id);
        if (selected.length > 0) duplicateNodes(selected);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") setSpaceHeld(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    nodes,
    undo,
    redo,
    copySelectedNodes,
    pasteClipboard,
    duplicateNodes,
    setActiveTool,
    setSelectedNode,
  ]);

  useEffect(() => {
    return () => {
      disableNativeCanvasCursor();
    };
  }, [disableNativeCanvasCursor]);

  return (
    <div
      className="w-full h-full absolute inset-0 builder-canvas-surface"
      ref={reactFlowWrapper}
      style={{ cursor: isHandMode ? "grab" : "default" }}
      onMouseEnter={enableNativeCanvasCursor}
      onMouseLeave={disableNativeCanvasCursor}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={SNAP_GRID}
        selectionOnDrag={!isHandMode}
        panOnDrag={isHandMode ? true : [1, 2]}
        selectNodesOnDrag={!isHandMode}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Controls />
        <Background color="rgba(255,255,255,0.04)" gap={20} size={1} />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            const type = n.data?.type;
            if (type === "input" || type === "output") return "#10b981";
            if (type === "conv2d" || type === "maxpool2d") return "#a855f7";
            if (type === "lstm" || type === "embedding") return "#06b6d4";
            return "#00F2FF";
          }}
          maskColor="rgba(0,0,0,0.7)"
          style={{
            backgroundColor: "#0B0B0F",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>

      {/* Tool toggle — top-left corner of canvas */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 bg-[#1A1A28]/90 backdrop-blur border border-white/10 rounded-xl p-1 shadow-lg">
        <button
          title="Select (V)"
          aria-label="Select tool"
          onClick={() => setActiveTool("select")}
          className={`p-2 rounded-lg transition-all ${
            activeTool === "select"
              ? "bg-cyan/20 text-cyan border border-cyan/40"
              : "text-dim hover:text-white hover:bg-white/5"
          }`}
        >
          <MousePointer2 size={15} />
        </button>
        <button
          title="Hand / Pan (H  or hold Space)"
          aria-label="Hand tool"
          onClick={() =>
            setActiveTool(activeTool === "hand" ? "select" : "hand")
          }
          className={`p-2 rounded-lg transition-all ${
            activeTool === "hand"
              ? "bg-violet/20 text-violet border border-violet/40"
              : "text-dim hover:text-white hover:bg-white/5"
          }`}
        >
          <Hand size={15} />
        </button>
      </div>

      {/* UX helper strip */}
      <div className="absolute top-3 right-3 z-10 hidden md:flex items-center gap-2 rounded-xl border border-white/10 bg-[#111723]/90 backdrop-blur px-3 py-2 text-[11px] font-mono tracking-wide text-dim">
        <Keyboard size={13} className="text-cyan" />
        <span className="text-white">V</span> Select
        <span className="text-white">H</span> Hand
        <span className="text-white">Space</span> Pan
        <span className="text-white">Del</span> Delete
      </div>

      <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-white/10 bg-[#0E121B]/85 px-3 py-1.5 text-[11px] font-mono text-dim backdrop-blur">
        <span className="text-cyan">{nodes.length}</span> nodes •{" "}
        <span className="text-violet">{edges.length}</span> edges • tool:{" "}
        <span className="text-white uppercase">{activeTool}</span>
      </div>
    </div>
  );
};

const BuilderCanvas = ({ onGraphChange }) => (
  <ReactFlowProvider>
    <BuilderCanvasContent onGraphChange={onGraphChange} />
  </ReactFlowProvider>
);

export default BuilderCanvas;
