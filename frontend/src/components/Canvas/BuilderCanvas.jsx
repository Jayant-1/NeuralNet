import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import { useBuilderStore } from '../../store/store';

const nodeTypes = { custom: CustomNode };

const BuilderCanvasContent = ({ onGraphChange }) => {
  const reactFlowWrapper = useRef(null);
  const { nodes: storeNodes, edges: storeEdges, setNodes: setStoreNodes, setEdges: setStoreEdges, setSelectedNode } = useBuilderStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Sync store → local when store changes externally (e.g., template load)
  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
  }, [storeNodes, storeEdges]);

  const notifyChange = useCallback((newNodes, newEdges) => {
    setStoreNodes(newNodes);
    setStoreEdges(newEdges);
    if (onGraphChange) onGraphChange(newNodes, newEdges);
  }, [onGraphChange, setStoreNodes, setStoreEdges]);

  const onConnect = useCallback(
    (params) => {
      const newEdges = addEdge({
        ...params,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }, edges);
      setEdges(newEdges);
      notifyChange(nodes, newEdges);
    },
    [edges, nodes, setEdges, notifyChange],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const typeData = event.dataTransfer.getData('application/reactflow');
      if (!typeData) return;

      const parsedData = JSON.parse(typeData);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'custom',
        position,
        data: {
          type: parsedData.type,
          label: parsedData.label,
          params: parsedData.defaultParams || {},
        },
      };

      const newNodes = [...nodes, newNode];
      setNodes(newNodes);
      notifyChange(newNodes, edges);
    },
    [reactFlowInstance, nodes, edges, setNodes, notifyChange],
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onNodesDelete = useCallback((deleted) => {
    const deletedIds = new Set(deleted.map(n => n.id));
    const newNodes = nodes.filter(n => !deletedIds.has(n.id));
    const newEdges = edges.filter(e => !deletedIds.has(e.source) && !deletedIds.has(e.target));
    notifyChange(newNodes, newEdges);
  }, [nodes, edges, notifyChange]);

  const handleNodesChange = (changes) => {
    onNodesChange(changes);
  };

  const handleEdgesChange = (changes) => {
    onEdgesChange(changes);
  };

  return (
    <div style={{ width: '100%', height: '100%' }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background color="rgba(255,255,255,0.03)" gap={20} size={1} />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            const type = n.data?.type;
            if (type === 'input' || type === 'output') return '#10b981';
            if (type === 'conv2d' || type === 'maxpool2d') return '#a855f7';
            if (type === 'lstm' || type === 'embedding') return '#06b6d4';
            return '#6366f1';
          }}
          maskColor="rgba(0,0,0,0.7)"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </ReactFlow>
    </div>
  );
};

const BuilderCanvas = ({ onGraphChange }) => (
  <ReactFlowProvider>
    <BuilderCanvasContent onGraphChange={onGraphChange} />
  </ReactFlowProvider>
);

export default BuilderCanvas;
