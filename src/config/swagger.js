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
        required: ['fullName', 'email', 'password'],
        properties: {
          _id: { type: 'string' },
          fullName: { type: 'string', minLength: 2 },
          matricNumber: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', pattern: '^\\+234\\d{10}$', description: 'Nigerian MSISDN (+234 followed by 10 digits)' },
          role: { type: 'string', enum: ['student', 'admin', 'super-admin'] },
          gender: { type: 'string', enum: ['male','female'] },
          level: { type: 'string', enum: ['100','200','300','400','500'], description: 'Student academic level (optional on create)' },
          department: { type: 'string', description: 'LASU department (subset)', enum: ['Computer Science','Mass Communication','Business Administration','Accounting','Biochemistry','Microbiology','Economics','Political Science','Physics','Chemistry','Mathematics','Law','Medicine','Philosophy','History'] }
        }
      },
      StudentListItem: {
        type: 'object',
        description: 'Lightweight student representation for listings',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          matricNumber: { type: 'string' },
          level: { type: 'string', enum: ['100','200','300','400','500'] },
          allocationStatus: { type: 'string', enum: ['pending','approved','rejected'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Hostel: {
        type: 'object',
        required: ['name', 'type', 'capacity'],
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', minLength: 2 },
          type: { type: 'string', enum: ['male', 'female'] },
          capacity: { type: 'integer', minimum: 1 },
          description: { type: 'string' }
        }
      },
      Room: {
        type: 'object',
        required: ['hostel', 'roomNumber', 'type', 'capacity'],
        properties: {
          _id: { type: 'string' },
          hostel: { type: 'string' },
          roomNumber: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['Standard', 'Premium'] },
          capacity: { type: 'integer', minimum: 1 },
          occupied: { type: 'integer', minimum: 0 }
        }
      },
      Allocation: {
        type: 'object',
        required: ['student', 'room', 'session'],
        properties: {
          _id: { type: 'string' },
          student: { type: 'string' },
          room: { type: 'string' },
          session: { type: 'string', minLength: 4 },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          allocatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Complaint: {
        type: 'object',
        required: ['student', 'type', 'description'],
        properties: {
          _id: { type: 'string' },
          student: { type: 'string' },
          type: { type: 'string', enum: ['Maintenance', 'Roommate', 'Facilities', 'Other'] },
          description: { type: 'string', minLength: 5 },
          status: { type: 'string', enum: ['Pending', 'Resolved'] },
          response: { type: 'string' },
          date: { type: 'string', format: 'date-time' }
        }
      },
      PagedMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1 },
          total: { type: 'integer', minimum: 0 },
          pageCount: { type: 'integer', minimum: 1 }
        }
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          uptime: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
          db: { type: 'string' }
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
