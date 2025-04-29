'use strict';

const assert = require('assert');
const ApiGatewayRequestValidator = require('./apiGatewayRequestValidator');

// Mock Serverless instance
class MockServerless {
  constructor() {
    this.service = {
      provider: {
        compiledCloudFormationTemplate: {
          Resources: {
            ApiGatewayRestApi: {
              Type: 'AWS::ApiGateway::RestApi',
              Properties: {}
            },
            ApiGatewayResourceUsers: {
              Type: 'AWS::ApiGateway::Resource',
              Properties: {}
            },
            ApiGatewayMethodUsersPost: {
              Type: 'AWS::ApiGateway::Method',
              Properties: {}
            },
            ApiGatewayMethodUsersIdGet: {
              Type: 'AWS::ApiGateway::Method',
              Properties: {}
            }
          }
        },
        stage: 'dev',
        name: 'aws'
      },
      service: 'test-service',
      functions: {
        createUser: {
          events: [
            {
              http: {
                path: '/users',
                method: 'post',
                request: {
                  validator: {
                    type: 'ALL'
                  },
                  schemas: {
                    'application/json': {
                      type: 'object',
                      required: ['name', 'email'],
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        getUser: {
          events: [
            {
              http: {
                path: '/users/{id}',
                method: 'get',
                request: {
                  validator: {
                    type: 'PARAMS_ONLY'
                  },
                  parameters: {
                    paths: {
                      id: true
                    }
                  }
                }
              }
            }
          ]
        }
      }
    };

    this.cli = {
      log: function(message) {
        console.log(message);
      }
    };

    this.configSchemaHandler = {
      defineFunctionEventProperties: () => {}
    };

    this.getProvider = () => {
      return {
        naming: {
          getMethodLogicalId: (resourceId, method) => {
            return `ApiGatewayMethod${resourceId}${method}`;
          },
          getResourceLogicalId: (path) => {
            // Simple mock for tests
            if (path === '/users') return 'UsersPost';
            if (path === '/users/{id}') return 'UsersIdGet';
            return path.replace(/\W/g, '');
          }
        },
        getStage: () => 'dev'
      };
    };

    // Mock for plugin detection
    this.pluginManager = {
      plugins: [{
        constructor: { name: 'AwsCompileApigEvents' },
        getMethodIntegration: () => {
          return {
            Properties: {
              Integration: {}
            }
          };
        },
        compileMethods: function() {
          return 'Original compile methods called';
        }
      }]
    };
  }
}

// Mock plugin class for testing
class MockAwsCompileApigEvents {
  constructor() {
    this.name = 'AwsCompileApigEvents';
  }
}

// Test cases
console.log('Running tests for ApiGatewayRequestValidator...');

// Test: Plugin initialization
function testPluginInitialization() {
  const serverless = new MockServerless();
  const options = {};
  const plugin = new ApiGatewayRequestValidator(serverless, options);
  
  assert(plugin.serverless === serverless, 'Serverless instance should be set');
  assert(plugin.options === options, 'Options should be set');
  console.log('✓ Plugin initialization successful');
}

// Test: Method compilation interceptor
function testMethodCompilationInterceptor() {
  const serverless = new MockServerless();
  const options = {};
  
  // Create plugin instance
  new ApiGatewayRequestValidator(serverless, options);
  
  // Get the compiled template resources
  const { Resources } = serverless.service.provider.compiledCloudFormationTemplate;
  
  // Call the modified compileMethods function
  const apiGatewayPlugin = serverless.pluginManager.plugins[0];
  apiGatewayPlugin.compileMethods();
  
  // Verify created resources
  const requestValidatorKeys = Object.keys(Resources).filter(key => 
    key.startsWith('RequestValidator')
  );
  
  assert.strictEqual(requestValidatorKeys.length, 2, 'Should create 2 request validators');
  
  // Check model creation for the POST endpoint
  const modelKeys = Object.keys(Resources).filter(key => 
    key.startsWith('Model')
  );
  
  assert.strictEqual(modelKeys.length, 1, 'Should create 1 model');
  
  console.log('✓ Method compilation interceptor is working');
  
  // Check that parameters are set for the GET endpoint
  const getMethodResource = Resources.ApiGatewayMethodUsersIdGet;
  assert(getMethodResource.Properties.RequestValidatorId, 'GET method should have a validator ID');
  
  console.log('✓ Request parameters are being set correctly');
}

// Run tests
try {
  testPluginInitialization();
  testMethodCompilationInterceptor();
  console.log('All tests passed!');
} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}