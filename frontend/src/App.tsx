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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
  Network,
  Play,
  Trash2,
  Terminal,
  Share2,
  Eraser,
  FileCode,
  BookOpen,
  Edit3,
  X,
  Settings,
  Tag,
  Globe,
  User,
  LayoutTemplate,
  ChevronRight,
  Cpu,
  Box,
  HardDrive,
  Grab,
  Server,
  Info
} from 'lucide-react';
import { generateClabYaml, generateClabConfig, parseClabYamlToFlow } from './utils';
import Editor from '@monaco-editor/react';
import ClabNode from './components/ClabNode';
import { templates } from './templates/index';

function EditorComponent() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, updateNodeData, setNodes, setEdges,
    apiUrl, setApiUrl, apiToken, apiUser, setApiUser,
    labName, setLabName
  } = useStore();
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [yamlPreview, setYamlPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showDoc, setShowDoc] = useState(false);
  const [docContent, setDocContent] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [consoleWidth, setConsoleWidth] = useState(500);
  const [yamlWidth, setYamlWidth] = useState(400);
  const [docWidth, setDocWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingYaml, setIsResizingYaml] = useState(false);
  const [isResizingDoc, setIsResizingDoc] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dynamicTemplates, setDynamicTemplates] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-fit view when YAML panel opens
    setTimeout(() => {
      fitView({ duration: 300 });
    }, 100);
  }, [showPreview, showLogs, fitView]);

  // Resize handler
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const startResizingYaml = useCallback(() => {
    setIsResizingYaml(true);
  }, []);

  const startResizingDoc = useCallback(() => {
    setIsResizingDoc(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setIsResizingYaml(false);
    setIsResizingDoc(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 1200) {
        setConsoleWidth(newWidth);
      }
    }
    if (isResizingYaml) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 1200) {
        setYamlWidth(newWidth);
      }
    }
    if (isResizingDoc) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 1200) {
        setDocWidth(newWidth);
      }
    }
  }, [isResizing, isResizingYaml, isResizingDoc]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

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

  // Fetch dynamic templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch('http://localhost:8000/templates');
      if (res.ok) {
        const list = await res.json();
        setDynamicTemplates(list);
      }
    } catch (e) {
      console.error("Failed to fetch templates", e);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadTemplate = async (filename: string) => {
    // Check if it's a built-in static template first (legacy support)
    const staticTpl = templates.find(t => t.id === filename);
    if (staticTpl) {
      if (confirm(`Load built-in '${staticTpl.name}'? This will clear your current canvas.`)) {
        setNodes(staticTpl.nodes);
        setEdges(staticTpl.edges);
      }
      return;
    }

    // Otherwise try dynamic
    try {
      if (confirm(`Load '${filename}'? This will clear your current canvas.`)) {
        const res = await fetch(`http://localhost:8000/templates/${filename}`);
        if (res.ok) {
          const data = await res.json();
          const { nodes: newNodes, edges: newEdges } = parseClabYamlToFlow(data.content);
          setNodes(newNodes);
          setEdges(newEdges);
          setLabName(filename.replace(/.clab.y(a)?ml$/, ''));
          setDocContent(data.doc || '');
          if (data.doc) setShowDoc(true);
        }
      }
    } catch (e) {
      alert('Failed to load template');
      console.error(e);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      let lastUploadedFilename = '';
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8000/templates/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          // alert(`✅ ${result.message}`); // Optional: reduce noise if auto-loading
          lastUploadedFilename = result.filename;
        } else {
          const error = await response.json();
          alert(`❌ Upload failed: ${error.detail}`);
        }
      }

      // Refresh template list
      await fetchTemplates();

      // Auto-load the uploaded template if available
      if (lastUploadedFilename) {
        // Only auto-load if it's a template file (not just a readme)
        if (lastUploadedFilename.endsWith('.yaml') || lastUploadedFilename.endsWith('.yml')) {
          setSelectedTemplateId(lastUploadedFilename);
          // We give a small delay to ensure state updates or simply call loading directly
          // Note: loadTemplate will ask for confirmation, which is good safety.
          loadTemplate(lastUploadedFilename);
        }
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (e) {
      alert('Failed to upload file');
      console.error(e);
    } finally {
      setIsUploading(false);
    }
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear the canvas?')) {
                setNodes([]);
                setEdges([]);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 text-muted-foreground border border-white/10 hover:bg-secondary hover:text-foreground transition-colors text-xs font-semibold"
            title="Clear Canvas"
          >
            <Eraser size={14} />
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold border ${showPreview ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 text-foreground border-white/10 hover:bg-secondary'}`}
          >
            <FileCode size={14} />
            YAML
          </button>

          {docContent && (
            <button
              onClick={() => setShowDoc(!showDoc)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold border ${showDoc ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-secondary/50 text-foreground border-white/10 hover:bg-secondary'}`}
            >
              <BookOpen size={14} />
              Guide
            </button>
          )}
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            disabled={isDeploying}
            onClick={handleDestroy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors text-xs font-semibold border border-destructive/20"
            title="Destroy Lab"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold border ${showLogs ? 'bg-secondary text-foreground border-white/20' : 'bg-secondary/50 text-muted-foreground border-white/10 hover:bg-secondary hover:text-foreground'}`}
            title={showLogs ? 'Hide Logs' : 'Show Logs'}
          >
            <Terminal size={14} />
          </button>
          <button
            disabled={isDeploying}
            onClick={handleDeploy}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold shadow-lg shadow-primary/20"
          >
            <Play size={14} fill="currentColor" />
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

              <h4 className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <LayoutTemplate size={14} />
                Templates
              </h4>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-background border rounded-md py-2 pl-3 pr-8 text-xs appearance-none focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Select a template...</option>
                    <optgroup label="Local Files">
                      {dynamicTemplates.length > 0 ? (
                        dynamicTemplates.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))
                      ) : (
                        <option disabled>(No files found)</option>
                      )}
                    </optgroup>
                    <optgroup label="Built-in Examples">
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronRight className="absolute right-3 top-2.5 text-muted-foreground rotate-90 pointer-events-none" size={14} />
                  <button
                    onClick={fetchTemplates}
                    className="absolute right-8 top-2 text-muted-foreground hover:text-primary transition-colors"
                    title="Refresh Templates"
                  >
                    <Share2 size={12} className={isLoadingTemplates ? "animate-spin" : ""} />
                  </button>
                </div>

                <button
                  disabled={!selectedTemplateId}
                  onClick={() => loadTemplate(selectedTemplateId)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors text-xs font-semibold disabled:opacity-50"
                >
                  <LayoutTemplate size={12} />
                  Load Template
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".clab.yaml,.clab.yml,.yaml,.yml,.md,.clab.md"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Upload button */}
                <button
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 text-foreground hover:bg-secondary border border-white/10 transition-colors text-xs font-semibold disabled:opacity-50"
                  title="Upload template files from your computer"
                >
                  <FileCode size={12} />
                  {isUploading ? 'Uploading...' : 'Upload Files'}
                </button>
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
                    <h5 className="text-[8px] text-muted-foreground/60 mb-2 ml-1 uppercase tracking-widest font-bold">Vendors</h5>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'nokia', name: 'Nokia', Icon: Cpu, color: 'text-blue-400' },
                        { id: 'arista', name: 'Arista', Icon: Box, color: 'text-sky-400' },
                        { id: 'juniper', name: 'Juniper', Icon: HardDrive, color: 'text-teal-400' },
                        { id: 'frr', name: 'FRR', Icon: Network, color: 'text-primary' },
                        { id: 'vyos', name: 'VyOS', Icon: Share2, color: 'text-orange-400' },
                        { id: 'mikrotik', name: 'Mikrotik', Icon: Network, color: 'text-rose-400' },
                      ].map(({ id, name, Icon, color }) => (
                        <div
                          key={id}
                          draggable
                          onDragStart={(e) => onDragStart(e, id)}
                          className="flex flex-col items-center gap-0.5 p-1 rounded-sm bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing group"
                          title={name}
                        >
                          <div className="w-4 h-4 rounded-sm bg-secondary/30 flex items-center justify-center border border-white/5 group-hover:border-primary/20 shadow-inner">
                            <Icon size={10} className={color} />
                          </div>
                          <span className="text-[6px] font-bold text-muted-foreground/50 group-hover:text-foreground uppercase tracking-tighter truncate w-full text-center">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-auto pt-6 border-t border-white/5">
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
            <Background color="#1e293b" gap={15} size={0.5} className="opacity-40" />
            <Controls />
            <Panel position="top-right" className="bg-background/80 border glass px-3 py-1 rounded-md text-[10px] text-muted-foreground flex items-center gap-2">
              <Info size={12} className="text-primary" />
              Click node to edit properties
            </Panel>
          </ReactFlow>
        </main>

        {showDoc && (
          <aside
            className={`border-l glass flex flex-col shrink-0 relative animate-in slide-in-from-right duration-300 ${isResizingDoc ? 'transition-none select-none' : ''}`}
            style={{ width: `${docWidth}px` }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={startResizingDoc}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-20 group"
            >
              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between sticky top-0 backdrop-blur-md z-10">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <BookOpen size={16} className="text-indigo-400" />
                Lab Documentation
              </h2>
              <button onClick={() => setShowDoc(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {docContent}
              </ReactMarkdown>
            </div>
          </aside>
        )}

        {/* YAML Preview Panel */}
        {showPreview && (
          <aside
            className={`border-l glass flex flex-col shrink-0 relative animate-in slide-in-from-right duration-300 ${isResizingYaml ? 'transition-none select-none' : ''}`}
            style={{ width: `${yamlWidth}px` }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={startResizingYaml}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-20 group"
            >
              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

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
          <aside
            className={`border-l glass flex flex-col shrink-0 relative animate-in slide-in-from-right duration-300 ${isResizing ? 'transition-none select-none' : ''}`}
            style={{ width: `${consoleWidth}px` }}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={startResizing}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-20 group"
            >
              <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-[#0f1117]">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Terminal size={16} className="text-primary" />
                Lab Console
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLogs([])}
                  className="text-muted-foreground hover:text-destructive transition-colors mr-2"
                  title="Clear Logs"
                >
                  <Eraser size={16} />
                </button>
                <button onClick={() => setShowLogs(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
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
    </div >
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <EditorComponent />
    </ReactFlowProvider>
  );
}
