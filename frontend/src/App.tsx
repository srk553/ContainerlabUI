import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from './store';
import { Network, Server, Play, FileCode, ChevronRight, X, Terminal, Trash2, Settings, Globe, User, Cpu, Box, HardDrive, Share2, Tag, Grab, Info, Edit3 } from 'lucide-react';
import { generateClabYaml, generateClabConfig } from './utils';
import Editor from '@monaco-editor/react';
import ClabNode from './components/ClabNode';

function EditorComponent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, updateNodeData,
    apiUrl, setApiUrl, apiToken, apiUser, setApiUser,
    labName, setLabName
  } = useStore();
  const { screenToFlowPosition } = useReactFlow();

  const [yamlPreview, setYamlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Filter for selected node
  const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes]);

  // Register custom node types
  const nodeTypes = useMemo(() => ({
    default: ClabNode,
  }), []);

  useEffect(() => {
    setYamlPreview(generateClabYaml(nodes, edges, labName));
  }, [nodes, edges, labName]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const stripAnsi = (str: string) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  };

  const addLog = (message: any) => {
    if (typeof message === 'object' && message !== null) {
      if (message.output) {
        // Strip ANSI and split by newline to preserve table formatting
        const cleanOutput = stripAnsi(message.output);
        const lines = cleanOutput.split('\n');
        setLogs(prev => [...prev, ...lines.filter(l => l.trim().length > 0 || l === '')]);
        return;
      }
      setLogs(prev => [...prev, JSON.stringify(message, null, 2)]);
    } else {
      setLogs(prev => [...prev, stripAnsi(String(message))]);
    }
  };

  const handleDeploy = async () => {
    setShowLogs(true);
    setIsDeploying(true);
    setLogs([]);
    addLog(`Initiating deployment of '${labName}' to ${apiUrl}...`);

    try {
      const config = generateClabConfig(nodes, edges, labName);
      const headers: Record<string, string> = {
        'X-Clab-User': apiUser
      };
      if (apiToken) {
        // Use 'secret:' prefix to tell the relay to sign this as a JWT
        headers['Authorization'] = `Bearer secret:${apiToken}`;
      }

      const response = await fetch(`http://localhost:8000/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${apiUrl}/labs?reconfigure=true`,
          method: 'POST',
          headers: headers,
          data: {
            topologyContent: config
          }
        }),
      });

      const result = await response.json();

      if (result.status >= 200 && result.status < 300) {
        addLog("Deployment successful!");
        addLog(result.data);
      } else {
        addLog(`Error (${result.status}): ${result.error || JSON.stringify(result.data)}`);

        // Smart deployment tips
        const errorStr = String(result.error);
        if (result.status === 500 && errorStr.includes("already been deployed")) {
          addLog("TIP: Try changing the Lab Name or click 'Destroy Lab' to clean up.");
        }
        if (errorStr.includes("pull access denied") || errorStr.includes("repository does not exist")) {
          addLog("TIP: This node (e.g. Arista/Juniper) requires a local Docker image or specific registry login. Ensure the image is available on your remote host or click the node to edit its 'Image' property.");
        }
        if (errorStr.includes("referenced in topology but does not exist")) {
          const bridgeName = errorStr.match(/bridge "([^"]+)"/)?.[1] || "the bridge";
          addLog(`TIP: Bridge nodes must exist on your remote Linux host. Create it using: 'sudo ip link add name ${bridgeName} type bridge && sudo ip link set ${bridgeName} up'`);
        }
      }
    } catch (error: any) {
      addLog(`Relay Connection Failed: ${error.message}. Is the backend running?`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDestroy = async () => {
    setShowLogs(true);
    setIsDeploying(true);
    setLogs([]);

    try {
      addLog(`Initiating destruction of lab '${labName}' through relay...`);

      const headers: Record<string, string> = {
        'X-Clab-User': apiUser
      };
      if (apiToken) {
        // Use 'secret:' prefix to tell the relay to sign this as a JWT
        headers['Authorization'] = `Bearer secret:${apiToken}`;
      }

      const response = await fetch(`http://localhost:8000/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${apiUrl}/labs/${labName}?cleanup=true`,
          method: 'DELETE',
          headers: headers
        }),
      });

      const result = await response.json();

      if (result.status >= 200 && result.status < 300) {
        addLog("Lab destroyed successfully.");
      } else {
        addLog(`Error (${result.status}): ${result.error || JSON.stringify(result.data)}`);
      }
    } catch (error: any) {
      addLog(`Relay Connection Failed: ${error.message}. Is the backend running?`);
    } finally {
      setIsDeploying(false);
    }
  };

  const getKindImage = (kind: string) => {
    const images: Record<string, string> = {
      'linux': 'alpine:latest',
      'frr': 'frrouting/frr:latest',
      'nokia': 'ghcr.io/nokia/srlinux:latest',
      'arista': 'ceos:latest',
      'juniper': 'vrnetlab/vr-vsrx:latest',
      'vyos': 'vyos/vyos:1.3.0',
      'mikrotik': 'mikrotik/ros:latest'
    };
    return images[kind] || 'alpine:latest';
  };

  const addNewNode = useCallback((kind: string, position?: { x: number, y: number }) => {
    const id = `${kind}-${nodes.length + 1}`;
    const newNode = {
      id,
      type: 'default',
      data: {
        label: id,
        kind: kind,
        image: getKindImage(kind)
      },
      position: position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
    };
    addNode(newNode);
  }, [nodes.length, addNode]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNewNode(type, position);
    },
    [screenToFlowPosition, addNewNode]
  );

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b glass flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50">
            <Network className="text-primary w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ClabUI</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${showPreview ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}
          >
            <FileCode size={18} />
            YAML
          </button>
          <button
            disabled={isDeploying}
            onClick={handleDeploy}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-lg shadow-primary/20"
          >
            <Play size={18} />
            {isDeploying ? 'Deploying...' : 'Deploy'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r glass p-4 flex flex-col gap-6 shrink-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {selectedNode ? (
            <div className="animate-in fade-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Edit3 size={14} />
                  Node Properties
                </h3>
                <button
                  onClick={() => onNodesChange([{ id: selectedNode.id, type: 'select', selected: false }])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Label / Hostname</label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full bg-background border rounded-md py-1.5 px-3 text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Docker Image</label>
                  <input
                    type="text"
                    value={selectedNode.data.image}
                    onChange={(e) => updateNodeData(selectedNode.id, { image: e.target.value })}
                    className="w-full bg-background border rounded-md py-1.5 px-3 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1 px-1">Tip: Use local images like 'ceos:4.30' for Arista.</p>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-muted-foreground">Type: <span className="text-foreground uppercase font-mono">{selectedNode.data.kind}</span></p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings size={14} />
                  Lab Settings
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <Tag size={14} className="absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={labName}
                      onChange={(e) => setLabName(e.target.value)}
                      className="w-full bg-background border rounded-md py-2 pl-9 pr-3 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Lab Name"
                    />
                  </div>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      className="w-full bg-background border rounded-md py-2 pl-9 pr-3 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                      placeholder="API URL"
                    />
                  </div>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      value={apiUser}
                      onChange={(e) => setApiUser(e.target.value)}
                      className="w-full bg-background border rounded-md py-2 pl-9 pr-3 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Linux User"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Grab size={14} />
                  Node Palette
                </h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-[9px] text-muted-foreground mb-2 ml-1">Hosts</h5>
                    <div
                      draggable
                      onDragStart={(e) => onDragStart(e, 'linux')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-transparent hover:border-primary/50 hover:bg-secondary/50 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="w-8 h-8 rounded bg-background flex items-center justify-center border group-hover:border-primary/30">
                        <Server size={18} className="text-primary" />
                      </div>
                      <span className="text-xs font-medium">Alpine</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[9px] text-muted-foreground mb-2 ml-1 uppercase tracking-tight">Vendors</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'nokia', name: 'Nokia SRL', icon: <Cpu size={14} className="text-blue-400" /> },
                        { id: 'arista', name: 'Arista cEOS', icon: <Box size={14} className="text-sky-400" /> },
                        { id: 'juniper', name: 'Juniper vSRX', icon: <HardDrive size={14} className="text-teal-400" /> },
                        { id: 'frr', name: 'FRR Router', icon: <Network size={14} className="text-primary" /> },
                        { id: 'vyos', name: 'VyOS', icon: <Share2 size={14} className="text-orange-400" /> },
                        { id: 'mikrotik', name: 'Mikrotik', icon: <Network size={14} className="text-rose-400" /> },
                      ].map((node) => (
                        <div
                          key={node.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, node.id)}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-secondary/20 border border-transparent hover:border-primary/40 hover:bg-secondary/40 transition-all cursor-grab active:cursor-grabbing group text-center"
                          title={node.name}
                        >
                          <div className="w-7 h-7 rounded bg-background flex items-center justify-center border group-hover:border-primary/20">
                            {node.icon}
                          </div>
                          <span className="text-[9px] font-medium truncate w-full">{node.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-auto pt-6 border-t border-white/5">
            <button
              disabled={isDeploying}
              onClick={handleDestroy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors text-xs font-semibold border border-destructive/20 mb-2"
            >
              <Trash2 size={14} />
              Destroy Lab
            </button>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-xs font-semibold"
            >
              <Terminal size={14} />
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
            <div className="mt-4 text-center">
              <p className="text-[10px] text-muted-foreground/50 flex items-center justify-center gap-1">
                Made with <span className="text-primary/50">❤️</span> by <span className="font-semibold text-foreground/40">srk</span>
              </p>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main
          className="flex-1 relative canvas-bg"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#1e293b" gap={20} />
            <Controls />
            <Panel position="top-right" className="bg-background/80 border glass px-3 py-1 rounded-md text-[10px] text-muted-foreground flex items-center gap-2">
              <Info size={12} className="text-primary" />
              Click node to edit properties
            </Panel>
          </ReactFlow>
        </main>

        {/* YAML Preview Panel */}
        {showPreview && (
          <aside className="w-[400px] border-l glass flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
            <div className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-background/50">
              <span className="text-sm font-semibold flex items-center gap-2">
                <FileCode size={16} className="text-primary" />
                {labName}.clab.yaml
              </span>
              <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="yaml"
                theme="vs-dark"
                value={yamlPreview}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 10 }
                }}
              />
            </div>
          </aside>
        )}

        {/* Console Panel */}
        {showLogs && (
          <aside className="w-[500px] border-l glass flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
            <div className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-[#0f1117]">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Terminal size={16} className="text-primary" />
                Lab Console
              </span>
              <button onClick={() => setShowLogs(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0c0e14] p-4 font-mono text-[11px] text-blue-100/90 leading-relaxed custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`mb-1 whitespace-pre-wrap font-mono ${log.includes("TIP:") ? "text-yellow-400 font-bold border-l-2 border-yellow-400 pl-2 my-2 py-1 bg-yellow-400/5 shadow-sm shadow-yellow-400/10" : ""}`}>
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 italic">
                  <Terminal size={40} className="mb-4 opacity-20" />
                  No logs available.
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <EditorComponent />
    </ReactFlowProvider>
  );
}
