import { HeartIcon } from "lucide-react";

function SiteFooter() {
  return (
    <footer className="w-full flex items-center justify-between p-4 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
        © {new Date().getFullYear()} Crafted with{" "}
        <HeartIcon className="h-[1em] aspect-square text-red-600 fill-current" />{" "}
        and passion at{" "}
        <a href="https://zopkit.com" target="_blank" className="ml-1 border-b border-b-gray-500 hover:border-b-gray-700 dark:border-b-gray-400 dark:hover:border-b-gray-200">
          zopkit
        </a>
        .
      </p>
      <div className="flex items-center space-x-4">
        <a
          href="#"
          className="text-sm text-gray-500 hover:underline dark:text-gray-400"
        >
          Privacy Policy
        </a>
        <a
          href="#"
          className="text-sm text-gray-500 hover:underline dark:text-gray-400"
        >
          Terms of Service
        </a>
      </div>
    </footer>
  );
}

export default SiteFooter;
