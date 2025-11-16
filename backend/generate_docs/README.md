# Module for Docs Generation

- Generates an `api_docs.html` in the root folder of each micro-service
  - Please ensure **all the backend services are running first**
- Note: This module is only meant to be used in **development mode**

```
node index.js
```

- We run `npx` instead of relying on a module as `redocly/cli` does not play well inside a `pnpm module`
