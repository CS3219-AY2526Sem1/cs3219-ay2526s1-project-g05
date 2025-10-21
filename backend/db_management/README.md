# 1. Pre-requisites

- `node 22.19.0 (LTS)`
- `pnpm 10`

# 2. This module provides 3 scripts:

- `pnpm run seed`
  - Will purge, set schemas and seed
- `pnpm run schema`
  - Set schemas into MongoDB
- `pnpm run purge`
  - Drop the database

# 3. Creating a new Schema:

- Simply add a new .js file into `/schemas` and **import it in `index.js`**
  - Your script will be automatically imported and ran by `schema.js`

# 4. Creating a new Seed Script

- Add a new .js file into `/seeding` and **modify `seed.js` to run it**

# 5. "Question" Collection Specific

- The `seed_questions.js` script downloads a `question.json` containing all the question data
  - To update it or if you think it is corrupted, simply **delete** `questions.json` to force it to re-download
