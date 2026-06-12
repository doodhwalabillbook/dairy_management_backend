const swaggerJsdoc = require('swagger-jsdoc');

const nodeEnv = process.env.NODE_ENV || 'local';

let swaggerUrl = 'http://localhost:3000';
if (process.env.SWAGGER_SERVER_URL) {
  swaggerUrl = process.env.SWAGGER_SERVER_URL;
} else if (nodeEnv === 'production') {
  swaggerUrl = 'https://api.doodhwalabillbook.in';
} else if (nodeEnv === 'development') {
  swaggerUrl = 'https://dev-api.doodhwalabillbook.in';
} else if (process.env.PORT) {
  swaggerUrl = `http://localhost:${process.env.PORT}`;
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend API',
      version: '1.0.0',
      description: 'API documentation for mobile backend',
    },
    servers: [
      {
        url: swaggerUrl,
        description: `${nodeEnv.charAt(0).toUpperCase() + nodeEnv.slice(1)} server`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/modules/**/*.js', 
    './src/routes/**/*.js',
    './src/docs/**/*.js'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
