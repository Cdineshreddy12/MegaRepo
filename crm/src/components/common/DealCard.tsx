import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Deal = {
    company: string;
    stage: string;
    createdBy: string;
    value: string;
    probability: number;
};

export default function DealCard({ deal }: { deal: Deal }) {
    return (
        <Card className="cursor-pointer hover:shadow-md">
            <CardHeader>
                <CardTitle>{deal.company}</CardTitle>
                <CardDescription>{deal.stage}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">Created by: {deal.createdBy}</p>
                </div>
                <div className="text-right">
                    <p className="font-medium">{deal.value}</p>
                    <p className="text-sm text-muted-foreground">{deal.probability}%</p>
                </div>
            </CardContent>
        </Card>
    );
}
