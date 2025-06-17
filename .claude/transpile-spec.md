Currently, the source code is stored in `src/`. Transpile them into `lib/`.
Ignore the `lib/` directory in the `.gitignore` file.

Update the `package.json` file to set the `type` field to `module`.
Also, properly set the `main` and `types` fields to point to the transpiled files in `lib/`.
