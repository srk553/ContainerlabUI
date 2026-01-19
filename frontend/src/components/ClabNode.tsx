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
        <div className={`px-1 py-0.5 rounded-sm border transition-all flex flex-col items-center gap-0 min-w-[12px] border-white/10 bg-[#0f172a] shadow-xl ${selected ? 'border-primary ring-1 ring-primary/50 scale-105' : 'hover:border-white/30'}`}>
            <Handle type="target" position={Position.Top} className="bg-primary" />

            <div className="w-3.5 h-3.5 flex items-center justify-center opacity-90">
                {icons[data.kind] || <Server size={9} className="text-primary" />}
            </div>

            <div className="flex flex-col items-center px-0.5 pointer-events-none -mt-0.5">
                <span className="text-[7px] font-black text-white/90 leading-tight uppercase tracking-tighter truncate max-w-[45px]">{data.label}</span>
                <span className="text-[5px] text-muted-foreground/60 uppercase tracking-widest font-mono leading-none">{data.kind}</span>
            </div>

            <Handle type="source" position={Position.Bottom} className="bg-primary" />
        </div>
    );
};

export default memo(ClabNode);
