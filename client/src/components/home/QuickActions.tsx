import { useLocation } from "wouter";
import { Store, Stethoscope, Wrench, Bus, Briefcase, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/motion.config";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "shops",
    label: "Shops",
    icon: <Store className="w-5 h-5" />,
    path: "/marketplace",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "doctors",
    label: "Doctors",
    icon: <Stethoscope className="w-5 h-5" />,
    path: "/hospitals",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "services",
    label: "Services",
    icon: <Wrench className="w-5 h-5" />,
    path: "/services",
    color: "from-purple-500 to-violet-500"
  },
  {
    id: "bus",
    label: "Bus",
    icon: <Bus className="w-5 h-5" />,
    path: "/bus-timetable",
    color: "from-orange-500 to-red-500"
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: <Briefcase className="w-5 h-5" />,
    path: "/jobs",
    color: "from-indigo-500 to-blue-500"
  },
  {
    id: "offers",
    label: "Offers",
    icon: <Tag className="w-5 h-5" />,
    path: "/offers",
    color: "from-pink-500 to-rose-500"
  }
];

export function QuickActions() {
  const [, setLocation] = useLocation();

  return (
    <motion.section
      className="px-4"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <motion.button
            key={action.id}
            onClick={() => setLocation(action.path)}
            variants={fadeUp}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 p-4 hover:border-white/20 active:scale-95 active:brightness-90 transition-all duration-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: `linear-gradient(135deg, ${action.color.split(' ')[1]}, ${action.color.split(' ')[3]})` }}
            />
            <motion.div
              className="relative flex flex-col items-center gap-2"
              whileHover={{ y: -1 }}
            >
              <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors duration-200">
                {action.icon}
              </div>
              <span className="text-xs font-medium text-white group-hover:text-white transition-colors">
                {action.label}
              </span>
            </motion.div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

export default QuickActions;