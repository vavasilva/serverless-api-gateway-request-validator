'use strict';

class ApiGatewayRequestValidator {
  constructor(serverless, options) {
    // Add schema definition for request validator config
    if (serverless.configSchemaHandler) {
      try {
        serverless.configSchemaHandler.defineFunctionEventProperties('aws', 'http', {
          properties: {
            request: {
              type: 'object',
              properties: {
                validator: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['ALL', 'BODY_ONLY', 'PARAMS_ONLY'] }
                  }
                },
                schemas: { type: 'object' },
                parameters: {
                  type: 'object',
                  properties: {
                    paths: { type: 'object' },
                    querystrings: { type: 'object' },
                    headers: { type: 'object' }
                  }
                }
              }
            }
          }
        });
      } catch (error) {
        // Schema property already defined, which is fine
        if (!error.message.includes('already have a definition')) {
          serverless.cli.log(`Warning: ${error.message}`);
        }
      }
    }

    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.hooks = {
      'before:package:finalize': this.addRequestValidators.bind(this),
    };
  }

  addRequestValidators() {
    const { service } = this.serverless;
    const { provider } = service;
    const stage = provider.stage || 'dev';
    const validatorTypes = {
      BODY_ONLY: 'BODY_ONLY',
      PARAMS_ONLY: 'PARAMS_ONLY',
      ALL: 'ALL',
    };

    // Skip if no CloudFormation resources exist
    if (!service.provider.compiledCloudFormationTemplate.Resources) {
      return;
    }

    const resources = service.provider.compiledCloudFormationTemplate.Resources;
    const restApiId = this.getRestApiId(resources);

    if (!restApiId) {
      this.serverless.cli.log('No REST API ID found. Skipping request validator configuration.');
      return;
    }

    // Create request validators
    const validatorConfigs = this.collectValidatorConfigs();
    if (Object.keys(validatorConfigs).length === 0) {
      this.serverless.cli.log('No validator configurations found.');
      return;
    }

    // Process each validator configuration
    Object.entries(validatorConfigs).forEach(([path, config]) => {
      const method = config.method.toUpperCase();
      const validatorType = validatorTypes[config.type] || 'ALL';
      const resourceName = this.getCleanResourceName(`RequestValidator${path.replace(/\//g, '')}${method}`);

      // Add the request validator resource
      resources[resourceName] = {
        Type: 'AWS::ApiGateway::RequestValidator',
        Properties: {
          RestApiId: { Ref: restApiId },
          ValidateRequestBody: validatorType === 'BODY_ONLY' || validatorType === 'ALL',
          ValidateRequestParameters: validatorType === 'PARAMS_ONLY' || validatorType === 'ALL',
          Name: `${service.service}-${stage}-${path}-${method}-validator`,
        },
      };

      // Find the corresponding method resource
      const resourceLogicalId = this.provider.naming.getResourceLogicalId(path);
      const methodLogicalId = this.provider.naming.getMethodLogicalId(resourceLogicalId, method);

      // Update the API Gateway method to use the validator
      if (resources[methodLogicalId]) {
        resources[methodLogicalId].Properties.RequestValidatorId = { Ref: resourceName };

        // Add request parameters if configured
        this.addRequestParameters(resources[methodLogicalId], config);

        // Add model if schemas are provided
        if (config.schemas) {
          Object.entries(config.schemas).forEach(([contentType, schema]) => {
            const modelName = this.getCleanResourceName(
              `Model${path.replace(/\//g, '')}${method}${contentType.replace(/\W/g, '')}`
            );
            
            // Add the model resource
            resources[modelName] = {
              Type: 'AWS::ApiGateway::Model',
              Properties: {
                RestApiId: { Ref: restApiId },
                ContentType: contentType,
                Description: `Schema for ${path} ${method} ${contentType}`,
                Schema: schema,
                Name: modelName,
              },
            };

            // Update method to use the model
            if (!resources[methodLogicalId].Properties.RequestModels) {
              resources[methodLogicalId].Properties.RequestModels = {};
            }
            resources[methodLogicalId].Properties.RequestModels[contentType] = { Ref: modelName };
          });
        }
      }
    });

    this.serverless.cli.log('Added API Gateway request validators.');
  }

  collectValidatorConfigs() {
    const validatorConfigs = {};
    const { service } = this.serverless;

    // Iterate through all functions
    Object.keys(service.functions || {}).forEach((functionName) => {
      const func = service.functions[functionName];

      // Process http events
      (func.events || []).forEach((event) => {
        if (!event.http) return;

        const http = event.http;
        const path = typeof http === 'object' ? http.path : '';
        const method = typeof http === 'object' ? http.method : '';
        
        // Skip if path is empty
        if (!path || !method) return;
        
        // Skip if no request validator is defined
        if (!http.request || !http.request.validator) return;

        validatorConfigs[path] = {
          type: http.request.validator.type || 'ALL',
          method: method,
          schemas: http.request.schemas || {},
          parameters: http.request.parameters || {}
        };
      });
    });

    return validatorConfigs;
  }

  getRestApiId(resources) {
    // Find the REST API resource
    const restApiResource = Object.keys(resources).find(
      (resourceName) => resources[resourceName].Type === 'AWS::ApiGateway::RestApi'
    );

    return restApiResource || null;
  }
  
  // Add request parameters to method if configured
  addRequestParameters(methodResource, config) {
    if (!config.parameters) {
      return;
    }
    
    const requestParameters = methodResource.Properties.RequestParameters || {};
    
    // Process path parameters
    if (config.parameters.paths) {
      Object.entries(config.parameters.paths).forEach(([param, required]) => {
        requestParameters[`method.request.path.${param}`] = required;
      });
    }
    
    // Process query parameters
    if (config.parameters.querystrings) {
      Object.entries(config.parameters.querystrings).forEach(([param, required]) => {
        requestParameters[`method.request.querystring.${param}`] = required;
      });
    }
    
    // Process header parameters
    if (config.parameters.headers) {
      Object.entries(config.parameters.headers).forEach(([param, required]) => {
        requestParameters[`method.request.header.${param}`] = required;
      });
    }
    
    // Only add if there are parameters
    if (Object.keys(requestParameters).length > 0) {
      methodResource.Properties.RequestParameters = requestParameters;
    }
  }

  getCleanResourceName(name) {
    // Remove invalid characters and ensure it's a valid CloudFormation resource name
    return name.replace(/[^a-zA-Z0-9]/g, '');
  }
}

module.exports = ApiGatewayRequestValidator;