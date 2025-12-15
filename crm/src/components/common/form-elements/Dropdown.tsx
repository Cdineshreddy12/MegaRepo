import * as React from "react";
import { MoreVertical } from "lucide-react";

interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {children}
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
          {React.Children.map(children, child => {
            if (React.isValidElement(child) && child.type === DropdownMenuContent) {
              return child;
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

export const DropdownMenuTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  children, 
  className, 
  ...props 
}) => {
  const ctx = React.useContext(DropdownContext);
  
  return (
    <button
      type="button"
      className={`flex items-center justify-center ${className || ''}`}
      onClick={() => ctx.setIsOpen(!ctx.isOpen)}
      {...props}
    >
      {children || <MoreVertical size={16} />}
    </button>
  );
};

export const DropdownMenuContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="py-1">
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ 
  children, 
  className, 
  onClick, 
  ...props 
}) => {
  return (
    <button
      type="button"
      className={`block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 ${className || ''}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Create context for state sharing
const DropdownContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

// Wrapper component that provides context
export const DropdownMenuRoot: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative" ref={dropdownRef}>
        {children}
        {isOpen && (
          <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && child.type === DropdownMenuContent) {
                return child;
              }
              return null;
            })}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
};