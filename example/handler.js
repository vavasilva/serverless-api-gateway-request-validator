'use strict';

module.exports.createUser = async (event) => {
  try {
    // The request body has been validated against the schema
    const user = JSON.parse(event.body);
    
    // Here you would normally save the user to a database
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'User created successfully',
        user
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error creating user',
        error: error.message
      })
    };
  }
};

module.exports.getUser = async (event) => {
  try {
    // The path parameters have been validated
    const { id } = event.pathParameters;
    
    // Here you would normally fetch the user from a database
    const user = {
      id,
      name: 'Example User',
      email: 'user@example.com'
    };
    
    return {
      statusCode: 200,
      body: JSON.stringify(user)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error fetching user',
        error: error.message
      })
    };
  }
};
