# Serverless API Gateway Request Validator

A Serverless Framework plugin that adds request validation to your AWS API Gateway endpoints.

## Installation

```bash
npm install --save-dev serverless-api-gateway-request-validator

# Using Serverless plugin install
serverless plugin install -n serverless-api-gateway-request-validator
```

Then add the plugin to your `serverless.yml` file:

```yaml
plugins:
  - serverless-api-gateway-request-validator
```

## Usage

Add request validation to your functions in `serverless.yml`:

```yaml
functions:
  myFunction:
    handler: handler.myFunction
    events:
      - http:
          path: /my-path
          method: post
          request:
            validator:
              type: ALL # Options: BODY_ONLY, PARAMS_ONLY, ALL
            schemas:
              application/json: ${file(schemas/my-schema.json)}
            # Optional: Parameter validation configuration
            parameters:
              paths:
                paramName: true  # Required path parameter
              querystrings:
                queryName: false # Optional query parameter
              headers:
                headerName: true # Required header
```

### Available Validator Types

- `BODY_ONLY`: Validates only the request body
- `PARAMS_ONLY`: Validates only the request parameters (path, query, header)
- `ALL`: Validates both body and parameters

### Parameter Validation

You can specify three types of parameters to validate:

1. **Path Parameters**: Parameters that are part of the URL path (e.g., `/users/{id}`)
2. **Query Parameters**: Parameters that are part of the URL query string (e.g., `/users?page=1&limit=10`)
3. **Header Parameters**: Parameters that are part of the HTTP headers

For each parameter, you can specify whether it is required (`true`) or optional (`false`).

## Example Configurations

### Basic JSON Schema Validation

```yaml
functions:
  createUser:
    handler: handlers/users.create
    events:
      - http:
          path: /users
          method: post
          request:
            validator:
              type: ALL
            schemas:
              application/json: ${file(schemas/create-user.json)}
```

### Path Parameter Validation

```yaml
functions:
  getUser:
    handler: handlers/users.get
    events:
      - http:
          path: /users/{id}
          method: get
          request:
            validator:
              type: PARAMS_ONLY
            parameters:
              paths:
                id: true  # Required path parameter
```

### Query Parameter Validation

```yaml
functions:
  listUsers:
    handler: handlers/users.list
    events:
      - http:
          path: /users
          method: get
          request:
            validator:
              type: PARAMS_ONLY
            parameters:
              querystrings:
                page: false  # Optional query parameter
                limit: false # Optional query parameter
                sort: false  # Optional query parameter
```

### Complete Example

```yaml
service: my-service

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

plugins:
  - serverless-api-gateway-request-validator

functions:
  createUser:
    handler: handlers/users.create
    events:
      - http:
          path: /users
          method: post
          request:
            validator:
              type: ALL
            schemas:
              application/json: ${file(schemas/create-user.json)}
              
  updateUser:
    handler: handlers/users.update
    events:
      - http:
          path: /users/{id}
          method: put
          request:
            validator:
              type: ALL
            schemas:
              application/json: ${file(schemas/update-user.json)}
            parameters:
              paths:
                id: true
              headers:
                Authorization: true
```

### JSON Schema Example

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "email"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "age": {
      "type": "integer",
      "minimum": 18
    },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "zipCode": { "type": "string" }
      }
    }
  }
}
```

## How It Works

This plugin works by:

1. Analyzing your Serverless configuration during the packaging phase
2. Finding any HTTP events with validator configurations
3. Creating AWS::ApiGateway::RequestValidator resources in the CloudFormation template
4. Adding AWS::ApiGateway::Model resources for your JSON schemas
5. Linking these resources to your API Gateway methods

## License

MIT
