const swaggerJsdoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Video Upload API",
            version: "1.0.0",
            description: "A REST API for handling video uploads",
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "Authorization",
                    description: "Add your API key with the request",
                },
            },
        },
    },
    apis: ["./src/routes/*.js"], // Path to the API routes
};

const specs = swaggerJsdoc(options);

module.exports = specs;
