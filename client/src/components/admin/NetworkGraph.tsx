/**
 * ============================================
 * NETWORK GRAPH COMPONENT - AI Monitoring Dashboard
 * ============================================
 * Interactive fraud network visualization
 */

import React, { useRef, useEffect } from 'react';

interface Node {
  id: string;
  label: string;
  type: 'user' | 'vendor' | 'ip';
  risk: number;
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
  type: 'review' | 'purchase' | 'ip_shared';
  strength: number;
}

interface NetworkData {
  nodes: Node[];
  links: Link[];
}

interface NetworkGraphProps {
  data: NetworkData;
  width?: number;
  height?: number;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  width = 800,
  height = 600
}) => {
  const fgRef = useRef<any>(null);

  useEffect(() => {
    if (fgRef.current) {
      // Auto-fit to canvas
      fgRef.current.zoomToFit(400, 50);
    }
  }, [data]);

  const getNodeColor = (node: Node) => {
    switch (node.type) {
      case 'user':
        return node.risk > 70 ? '#ef4444' : node.risk > 40 ? '#f59e0b' : '#10b981';
      case 'vendor':
        return node.risk > 70 ? '#dc2626' : node.risk > 40 ? '#d97706' : '#059669';
      case 'ip':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getNodeSize = (node: Node) => {
    const baseSize = node.type === 'ip' ? 6 : node.type === 'vendor' ? 8 : 5;
    return baseSize + (node.risk / 20); // Risk affects size
  };

  const getLinkColor = (link: Link) => {
    switch (link.type) {
      case 'review':
        return '#f59e0b';
      case 'purchase':
        return '#10b981';
      case 'ip_shared':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getLinkWidth = (link: Link) => {
    return Math.max(1, link.strength / 2);
  };

  return (
    <div className="w-full h-full border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-center text-gray-500">
        <h3 className="text-lg font-medium mb-2">Network Graph</h3>
        <p>Coming Soon - Fraud Network Visualization</p>
      </div>
    </div>
  );
};

export default NetworkGraph;