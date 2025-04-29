'use strict';

module.exports.create = async (event) => {
  try {
    // The request body has been validated against article.json schema
    const article = JSON.parse(event.body);
    
    // Here you would save the article to a database
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Article created successfully',
        articleId: 'abc123', // This would be the ID from your database
        article
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error creating article',
        error: error.message
      })
    };
  }
};

module.exports.update = async (event) => {
  try {
    // Path parameters and request body have been validated
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body);
    
    // Here you would update the article in your database
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Article updated successfully',
        articleId: id,
        updates
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error updating article',
        error: error.message
      })
    };
  }
};

module.exports.list = async (event) => {
  try {
    // Query parameters (page, limit, sort) have been validated if provided
    const { page = '1', limit = '10', sort = 'createdAt' } = event.queryStringParameters || {};
    
    // Here you would fetch articles from your database with pagination
    const articles = [
      { id: 'article1', title: 'Example Article 1' },
      { id: 'article2', title: 'Example Article 2' }
    ];
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort,
        total: 2,
        articles
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error listing articles',
        error: error.message
      })
    };
  }
};

module.exports.get = async (event) => {
  try {
    // Path parameter 'id' has been validated
    const { id } = event.pathParameters;
    
    // Here you would fetch the article from your database
    const article = {
      id,
      title: 'Example Article',
      content: 'This is an example article content',
      authorId: '507f1f77bcf86cd799439011',
      status: 'published',
      tags: ['example', 'test']
    };
    
    return {
      statusCode: 200,
      body: JSON.stringify(article)
    };
  } catch (error) {
    return {
      statusCode: 500, 
      body: JSON.stringify({
        message: 'Error fetching article',
        error: error.message
      })
    };
  }
};