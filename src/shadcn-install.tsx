import { ActionPanel, Action, List, Icon, showToast, Toast, Clipboard, closeMainWindow } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import { Registry, availableRegistries } from "./registries"; // Import from new file

// Define ComponentFile interface for Shadcn API structure
interface ComponentFile {
  name: string;
  dir: string;
  content: string; // Keep content if needed later, otherwise it can be removed
}

// Update Component interface
interface Component {
  name: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[]; // Keep for Kitze's potential structure
  files: string[]; // Will store processed file paths as strings
  type: string; // Broaden type to string to accommodate both registries
}

// Type for the raw component item from Shadcn index.json
interface ShadcnIndexComponentRaw {
  name: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: string[]; // Direct array of strings
  type: string;
}

// Define KitzeFile interface
interface KitzeFile {
  path: string;
  type: string;
}

// Type for the raw component item from Kitze registry.json
interface KitzeComponentRaw {
  name: string;
  title?: string; // Kitze has title
  description?: string; // Kitze has description
  dependencies?: string[];
  registryDependencies?: string[];
  files: KitzeFile[]; // Kitze specific file structure
  type: string;
}

// Type for the overall Kitze registry response
interface KitzeRegistryResponse {
  $schema: string;
  name: string;
  homepage: string;
  items: KitzeComponentRaw[];
}

export default function Command() {
  const [selectedRegistry, setSelectedRegistry] = useState<Registry | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComponents = async (registry: Registry) => {
    setIsLoading(true);
    setError(null);
    setComponents([]);

    const url = registry.jsonUrl; // Fetch from the jsonUrl

    try {
      await showToast({ style: Toast.Style.Animated, title: `Fetching from ${registry.name}...` });
      const response = await fetch(url);
      if (!response.ok) {
        let errorBody = "Unknown error";
        try {
          errorBody = await response.text();
        } catch (_e) {
          /* ignore */
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
      }

      const rawData = await response.json();
      let processedComponents: Component[] = [];

      if (registry.name === "Shadcn UI") {
        // Shadcn index.json returns an array directly
        const rawComponents = rawData as ShadcnIndexComponentRaw[];
        // Data already matches the target Component structure closely
        processedComponents = rawComponents.map((comp) => ({
          name: comp.name,
          description: undefined,
          dependencies: comp.dependencies,
          registryDependencies: comp.registryDependencies,
          files: comp.files, // Already string[]
          type: comp.type,
        }));
      } else if (registry.name === "Kitze UI") {
        // Kitze registry.json returns an object with an "items" array
        const registryResponse = rawData as KitzeRegistryResponse;
        const rawComponents = registryResponse.items;
        processedComponents = rawComponents.map((comp) => ({
          name: comp.name,
          description: comp.description,
          dependencies: comp.dependencies,
          registryDependencies: comp.registryDependencies,
          // Kitze file structure: { path, type } -> extract path
          files: comp.files.map((file) => file.path),
          type: comp.type,
        }));
      } else {
        // Fallback for potential other registries
        // Assume direct array structure like Shadcn's index.json for simplicity
        console.warn(`Processing unknown registry type: ${registry.name}. Assuming direct array structure.`);
        try {
          processedComponents = (rawData as unknown[]).map((comp: unknown) => {
            // Perform type checks since comp is now unknown
            const name =
              typeof comp === "object" && comp !== null && "name" in comp && typeof comp.name === "string"
                ? comp.name
                : "Unknown Component";
            const description =
              typeof comp === "object" && comp !== null && "description" in comp && typeof comp.description === "string"
                ? comp.description
                : undefined;
            const files =
              typeof comp === "object" && comp !== null && "files" in comp && Array.isArray(comp.files)
                ? comp.files.map(String)
                : [];
            const dependencies =
              typeof comp === "object" && comp !== null && "dependencies" in comp && Array.isArray(comp.dependencies)
                ? comp.dependencies.map(String)
                : undefined;
            const registryDependencies =
              typeof comp === "object" &&
              comp !== null &&
              "registryDependencies" in comp &&
              Array.isArray(comp.registryDependencies)
                ? comp.registryDependencies.map(String)
                : undefined;
            const type =
              typeof comp === "object" && comp !== null && "type" in comp && typeof comp.type === "string"
                ? comp.type
                : "unknown";

            return {
              name,
              description,
              files,
              dependencies,
              registryDependencies,
              type,
            };
          });
        } catch (fallbackError) {
          console.error(`Error processing fallback registry ${registry.name}:`, fallbackError);
          throw new Error(`Failed to process data structure for registry: ${registry.name}`);
        }
      }

      const validComponents = processedComponents.filter((c) => c && c.name && c.name !== "Unknown Component");
      setComponents(validComponents);

      await showToast({
        style: Toast.Style.Success,
        title: "Components loaded",
        message: `${validComponents.length} components found in ${registry.name}`,
      });
    } catch (e) {
      console.error("Fetch error:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
      setError(errorMessage);
      await showToast({ style: Toast.Style.Failure, title: "Error Fetching Components", message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRegistry = (registry: Registry) => {
    setSelectedRegistry(registry);
    fetchComponents(registry);
  };

  const handleGoBack = () => {
    setSelectedRegistry(null);
    setComponents([]); // Clear components when going back
    setError(null); // Clear error when going back
  };

  const handlePasteComponentUrl = async (registry: Registry, componentName: string) => {
    const componentJsonUrl = `${registry.componentJsonBaseUrl}${componentName}.json`;
    try {
      await Clipboard.paste(componentJsonUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Pasted Component URL",
        message: componentJsonUrl,
      });
      await closeMainWindow();
    } catch (_error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Paste URL",
        message: String(_error),
      });
    }
  };

  if (!selectedRegistry) {
    // Render Registry List
    return (
      <List searchBarPlaceholder="Search registries..." isLoading={isLoading}>
        {error && <List.EmptyView title="Error Loading Registries" description={error} icon={Icon.Warning} />}
        {availableRegistries.map((registry) => (
          <List.Item
            key={registry.jsonUrl} // Use jsonUrl as key
            icon={registry.icon || Icon.Box}
            title={registry.name}
            subtitle={registry.description}
            actions={
              <ActionPanel>
                <Action title="Browse Components" icon={Icon.List} onAction={() => handleSelectRegistry(registry)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  } else {
    // Render Component List with Detail View
    return (
      <List
        searchBarPlaceholder="Search components..."
        isLoading={isLoading}
        navigationTitle={`${selectedRegistry.name} Components`}
        isShowingDetail={true} // Enable detail view
      >
        {error && <List.EmptyView title="Error Fetching Components" description={error} icon={Icon.Warning} />}
        {!error && components.length === 0 && !isLoading && (
          <List.EmptyView
            title="No Components Found"
            description={`No components listed in ${selectedRegistry.name}.`}
            icon={Icon.QuestionMark}
          />
        )}
        {components.map((component: Component) => {
          // Function to clean up registry dependency display name
          const getCleanDepName = (dep: string): string => {
            try {
              const url = new URL(dep);
              if (url.pathname.endsWith(".json")) {
                // Extract filename without extension
                const parts = url.pathname.split("/");
                const filename = parts[parts.length - 1];
                return filename.replace(".json", "");
              }
            } catch (e) {
              // Not a valid URL, return as is
            }
            return dep; // Return original if not a matching URL
          };

          // Construct markdown for the detail view with correct newlines and cleaned deps
          const detailMarkdown = `
# ${component.name}

${component.description || "*No description available.*"}

${component.dependencies?.length ? `**Dependencies:**\n${component.dependencies.map((dep) => `* ${dep}`).join("\n")}` : ""}\n
${component.registryDependencies?.length ? `**Registry Dependencies:**\n${component.registryDependencies.map((dep) => `* ${getCleanDepName(dep)}`).join("\n")}` : ""}\n
${component.files?.length ? `**Files:**\n${component.files.map((file) => `* \`${file}\``).join("\n")}` : ""}\n          `;

          return (
            <List.Item
              key={component.name}
              icon={Icon.Code}
              title={component.name}
              subtitle={component.description || component.files.join(", ")}
              keywords={[...(component.dependencies ?? []), ...(component.registryDependencies ?? [])]}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              actions={
                <ActionPanel>
                  {/* Primary action: Paste Install Command with full URL */}
                  <Action.Paste
                    title="Paste Install Command (with URL)"
                    content={`npx shadcn-ui@latest add ${selectedRegistry.componentJsonBaseUrl}${component.name}.json`}
                    shortcut={{ modifiers: [], key: "enter" }}
                  />
                  {/* Secondary action: Copy Install Command (name only) */}
                  <Action.CopyToClipboard
                    title="Copy Install Command (name only)"
                    content={`npx shadcn-ui@latest add ${component.name}`}
                  />
                  {/* Back action */}
                  <Action
                    title="Go Back to Registries"
                    icon={Icon.ArrowLeft}
                    onAction={handleGoBack}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
    );
  }
}
