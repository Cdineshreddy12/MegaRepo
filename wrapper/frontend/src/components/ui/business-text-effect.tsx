"use client";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

const businessWords = `Enterprise-grade business management platform designed for modern teams. Seamlessly integrate CRM, HRMS, project management, and finance operations into a unified, scalable solution that grows with your business.
`;

export function BusinessTextEffect() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <TextGenerateEffect
        words={businessWords}
        className="text-center"
        duration={0.8}
        filter={true}
      />
    </div>
  );
}
