import Loader from "@/components/common/Loader";
import React, { ReactNode } from "react";

export const withSuspense = (Component: React.ComponentType, fallback: ReactNode = <Loader />) => {
    return function WithSuspense(props: React.ComponentProps<typeof Component>) {
        return (
        <React.Suspense fallback={fallback}>
            <Component {...props} />
        </React.Suspense>
        );
    };
}