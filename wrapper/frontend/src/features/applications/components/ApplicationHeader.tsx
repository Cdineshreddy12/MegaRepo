import { Typography } from "@/components/common/Typography";
import LoadingButton from "@/components/common/LoadingButton";
import { PearlButton } from "@/components/ui/pearl-button";
import { RefreshCw } from "lucide-react";
import { Flex } from "@/components/common/Page";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getThemeColors } from "./applicationUtils";

interface ApplicationHeaderProps {
    applicationCount: number;
    isLoading: boolean;
    onRefresh: () => void;
}

export function ApplicationHeader({ applicationCount, isLoading, onRefresh }: ApplicationHeaderProps) {
    const { actualTheme } = useTheme();
    const themeColors = getThemeColors(actualTheme);

    return (
        <Flex align="center" justify="between" >
            <Flex direction="col">
                <Typography variant="h2" className={`text-xl  text-center ${themeColors.titleColor}`}>Applications</Typography>
            </Flex>
            <PearlButton onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </PearlButton>
        </Flex>
    );
}
