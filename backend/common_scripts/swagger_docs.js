import expressJSDocSwagger from "express-jsdoc-swagger";

export const startSwaggerDocs = (app, name, port) => {
  const options = {
    info: {
      version: "1.0.0",
      title: name,
      license: {
        name: "MIT",
      },
    },
    security: {
      BasicAuth: {
        type: "http",
        scheme: "basic",
      },
    },
    baseDir: process.cwd(),
    // Glob pattern to find your jsdoc files (multiple patterns can be added in an array)
    filesPattern: "./**/*.js",
    swaggerUIPath: "/docs",
  };

  expressJSDocSwagger(app)(options);
  console.log(
    `SwaggerUI docs now available at ${`http://localhost:${port}/docs`}`,
  );
};
