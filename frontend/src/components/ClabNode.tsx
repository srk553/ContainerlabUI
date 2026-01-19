import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Network, Server, Cpu, Box, HardDrive, Share2 } from 'lucide-react';

const icons: Record<string, any> = {
    'linux': <Server size={18} className="text-primary" />,
    'frr': <Network size={18} className="text-primary" />,
    'nokia': <Cpu size={18} className="text-blue-400" />,
    'arista': <Box size={18} className="text-sky-400" />,
    'juniper': <HardDrive size={18} className="text-teal-400" />,
    'vyos': <Share2 size={18} className="text-orange-400" />,
    'mikrotik': <Network size={18} className="text-rose-400" />,
};

const ClabNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={`px-3 py-2 rounded-lg glass border transition-all flex flex-col items-center gap-1 min-w-[30px] border-white/20 bg-background/80 ${selected ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/20 scale-105' : 'hover:border-white/40'}`}>
            <Handle type="target" position={Position.Top} className="w-2 h-2 bg-primary border border-background !top-[-4px]" />

            <div className="w-8 h-8 rounded flex items-center justify-center bg-secondary/30 border border-white/5 transition-colors">
                {icons[data.kind] || <Server size={18} className="text-primary" />}
            </div>

            <div className="flex flex-col items-center px-1">
                <span className="text-[11px] font-bold text-foreground leading-tight">{data.label}</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-tight font-mono opacity-80">{data.kind}</span>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary border border-background !bottom-[-4px]" />
        </div>
    );
};

export default memo(ClabNode);
