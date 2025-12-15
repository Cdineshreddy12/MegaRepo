import { CONTENT } from "@/constants/content";
import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div
      className="grid min-h-svh lg:grid-cols-1 overflow-auto bg-gradient-to-t from-primary/40 to-primary/0"
    >
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background">
              <img src={CONTENT.APP.logo} alt={CONTENT.APP.name} />
            </div>
            {CONTENT.APP.name}
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center z-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
