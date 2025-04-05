# Shadcn Install - Raycast Extension

A Raycast extension that allows you to browse and install shadcn UI components from multiple registries.

## Features

- Browse components from multiple shadcn registries
- Search for specific components
- View component details including:
  - Dependencies
  - Files that will be created
  - Registry dependencies
- Copy installation commands to clipboard

## Supported Registries

- **Shadcn UI** - The official shadcn/ui components registry (https://ui.shadcn.com)
- **Kitze UI** - Kitze's shadcn components registry (https://ui.kitze.io)

## Usage

1. Open Raycast and search for "Shadcn Install"
2. Select a registry from the list
3. Browse and search for components
4. Click on a component to view details
5. Use the "Copy Install Command" action to copy the installation command to clipboard
6. Paste the command in your terminal to install the component

## Installation Commands

The extension generates installation commands in the following format:

```bash
npx shadcn@latest add [component-name] --registry [registry-url]
```

For example:

```bash
npx shadcn@latest add button --registry https://ui.shadcn.com/r.json
```

## Adding New Registries

To add a new registry, you can submit a pull request to add it to the `availableRegistries` array in the source code.

## License

MIT - See LICENSE file for details
