import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Network, Server, Cpu, Box, HardDrive, Share2 } from 'lucide-react';

const icons: Record<string, any> = {
    'linux': <Server size={10} className="text-primary" />,
    'frr': <Network size={10} className="text-primary" />,
    'nokia': <Cpu size={10} className="text-blue-400" />,
    'arista': <Box size={10} className="text-sky-400" />,
    'juniper': <HardDrive size={10} className="text-teal-400" />,
    'vyos': <Share2 size={10} className="text-orange-400" />,
    'mikrotik': <Network size={10} className="text-rose-400" />,
};

const ClabNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={`px-1.5 py-1 rounded-md glass border transition-all flex flex-col items-center gap-0.5 min-w-[15px] border-white/10 bg-background/95 ${selected ? 'border-primary ring-1 ring-primary/50 shadow-lg shadow-primary/20 scale-105' : 'hover:border-white/30'}`}>
            <Handle type="target" position={Position.Top} className="w-1 h-1 bg-primary border-none !top-[-2px]" />

            <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-secondary/20 border border-white/5 transition-colors">
                {icons[data.kind] || <Server size={10} className="text-primary" />}
            </div>

            <div className="flex flex-col items-center px-0.5 pointer-events-none">
                <span className="text-[8px] font-bold text-foreground leading-none mb-0.5 truncate max-w-[60px]">{data.label}</span>
                <span className="text-[6px] text-muted-foreground uppercase tracking-tight font-mono opacity-70 leading-none">{data.kind}</span>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-1 h-1 bg-primary border-none !bottom-[-2px]" />
        </div>
    );
};

export default memo(ClabNode);
