import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Hostel Allocation API',
    version: '1.0.0',
    description: 'API documentation for the Hostel Allocation System',
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Local dev server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['student', 'admin', 'super-admin'] }
        }
      },
      Hostel: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          capacity: { type: 'number' }
        }
      },
      Room: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          hostel: { type: 'string' },
          number: { type: 'string' },
          capacity: { type: 'number' },
          occupants: { type: 'array', items: { type: 'string' } }
        }
      },
      Allocation: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          student: { type: 'string' },
          room: { type: 'string' },
          status: { type: 'string' }
        }
      },
      Complaint: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          student: { type: 'string' },
          message: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
