export interface Registry {
  name: string;
  jsonUrl: string; // URL for the registry index JSON
  componentJsonBaseUrl: string; // Base URL for individual component JSONs
  description: string;
  icon?: string;
}

export const availableRegistries: Registry[] = [
  {
    name: "Shadcn UI",
    jsonUrl: "https://ui.shadcn.com/registry/index.json",
    // Assuming this structure based on typical CLI usage and user request
    componentJsonBaseUrl: "https://ui.shadcn.com/registry/components/r/",
    description: "Official shadcn components",
    icon: "🎨",
  },
  {
    name: "Kitze UI",
    jsonUrl: "https://ui.kitze.io/registry.json",
    componentJsonBaseUrl: "https://ui.kitze.io/r/", // Base URL for Kitze component JSONs
    description: "Kitze UI components",
    icon: "🧩",
  },
];
