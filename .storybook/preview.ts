import type { Preview } from "@storybook/react-vite";
import "../public/styles.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ["Characters", ["All stages", "Character explorer", "All monsters", "Monster explorer", "Treasure reward reveal"]],
      },
    },
  },
};

export default preview;
