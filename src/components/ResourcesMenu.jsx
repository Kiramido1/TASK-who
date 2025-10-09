import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Menu, X, FileSpreadsheet, AlertTriangle, 
  User, TrendingDown, ExternalLink 
} from 'lucide-react';

const RESOURCES = [
  {
    name: 'SD Cheatsheet',
    url: 'https://docs.google.com/spreadsheets/d/11MkolHCcU3Y8_PfStJWem0-9TKbnNf1t6ycHOGUo4F0/edit?gid=712688043#gid=712688043',
    icon: FileSpreadsheet,
    color: 'text-green-500'
  },
  {
    name: 'Hazardous Behaviors',
    url: 'https://docs.google.com/presentation/d/1jVAMCP7wFwBzgPux-W2gZxHtD33YsAxSObW4ueB1viw/present?slide=id.g37b6b464073_0_201',
    icon: AlertTriangle,
    color: 'text-red-500'
  },
  {
    name: 'Ego Actions',
    url: 'https://docs.google.com/presentation/d/1UF7tBGWmZApb1SMMvF-37inoaqS1NKWEDmltNRTEfOw/present?slide=id.g37b6b464073_0_214',
    icon: User,
    color: 'text-blue-500'
  },
  {
    name: 'Loss Factor',
    url: 'https://docs.google.com/presentation/d/1G2JMX5SZFiIPp7GjIIncMPZz8usvk6b-6iwmkNgWdNQ/present?slide=id.g37b6b464073_0_227',
    icon: TrendingDown,
    color: 'text-orange-500'
  }
];

export function ResourcesMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Menu Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 glass-effect"
        variant="outline"
        size="icon"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </Button>

      {/* Sidebar Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-black/95 backdrop-blur-lg border-l border-primary/20 z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 pt-20">
          <h2 className="text-xl font-bold text-primary mb-6">Resources</h2>
          
          <div className="space-y-3">
            {RESOURCES.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg luxury-gradient hover-lift group transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className={`w-5 h-5 ${resource.color}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                      {resource.name}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </a>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs text-gray-400 text-center">
              اضغط على أي رابط للفتح في نافذة جديدة
            </p>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
