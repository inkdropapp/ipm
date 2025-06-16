# Package API Documentation

This document describes the Package API endpoints for Inkdrop's server API.

## Base URL

`https://api.inkdrop.app/v1/packages`

## Rate Limiting

- 120 requests per minute
- Rate limiting is applied to all public endpoints

## Authentication

Some endpoints require authentication using Basic Auth or Bearer token.

## Endpoints

### List Packages

```
GET /packages
```

Returns a list of packages ordered by specified criteria.

**Query Parameters:**

- `page` (number) - Page number for pagination
- `sort` (string) - Sort criteria
- `theme` (boolean) - Filter for theme packages

**Response:** Array of package objects (without `_id`, `_rev`, `owner`, `versions` fields)

### Search Packages

```
GET /packages/search
```

Search packages by query string.

**Query Parameters:**

- `q` (string) - Search query
- `sort` (string) - Sort criteria
- `direction` (string) - Sort direction

**Response:** Array of package objects (without `_id`, `_rev`, `owner` fields)

### Get Package

```
GET /packages/:package_name
```

Returns detailed information about a specific package.
It is used for checking newer versions of packages.

**Response:** Package object (without `_id`, `_rev`, `owner` fields)

#### Example

- `GET https://api.inkdrop.app/v1/packages/solarized-dark-ui`

```json
{
  "name": "solarized-dark-ui",
  "created_at": 1729823404936,
  "updated_at": 1737444676099,
  "repository": "inkdropapp/solarized-dark-ui",
  "downloads": 712,
  "stargazers_count": 0,
  "releases": {
    "latest": "1.1.0"
  },
  "versions": {
    "1.0.0": {
      "name": "solarized-dark-ui",
      "version": "1.0.0",
      "theme": "ui",
      "themeAppearance": "dark",
      "type": "module",
      "description": "Solarized Dark UI Theme for Inkdrop",
      "styleSheets": ["tokens.css", "theme.css"],
      "scripts": {},
      "keywords": ["inkdrop", "markdown"],
      "repository": "https://github.com/inkdropapp/solarized-dark-ui",
      "author": "Takuya Matsuyama<t@inkdrop.app>",
      "license": "MIT",
      "devDependencies": {
        "@inkdropapp/theme-dev-helpers": "^0.3.6"
      },
      "engines": {
        "inkdrop": "^5.9.0"
      },
      "dist": {
        "tarball": "https://api.inkdrop.app/v1/packages/solarized-dark-ui/versions/1.0.0/tarball"
      }
    },
    "1.0.1": {
      "name": "solarized-dark-ui",
      "version": "1.0.1",
      "theme": "ui",
      "themeAppearance": "dark",
      "type": "module",
      "description": "Solarized Dark UI Theme for Inkdrop",
      "styleSheets": ["tokens.css", "theme.css"],
      "scripts": {},
      "keywords": ["inkdrop", "markdown"],
      "repository": "https://github.com/inkdropapp/solarized-dark-ui",
      "author": "Takuya Matsuyama<t@inkdrop.app>",
      "license": "MIT",
      "devDependencies": {
        "@inkdropapp/theme-dev-helpers": "^0.3.7"
      },
      "engines": {
        "inkdrop": "^5.9.0"
      },
      "dist": {
        "tarball": "https://api.inkdrop.app/v1/packages/solarized-dark-ui/versions/1.0.1/tarball"
      }
    },
    "1.1.0": {
      "name": "solarized-dark-ui",
      "version": "1.1.0",
      "theme": "ui",
      "themeAppearance": "dark",
      "type": "module",
      "description": "Solarized Dark UI Theme for Inkdrop",
      "styleSheets": ["tokens.css", "theme.css"],
      "scripts": {},
      "keywords": ["inkdrop", "markdown"],
      "repository": "https://github.com/inkdropapp/solarized-dark-ui",
      "author": "Takuya Matsuyama<t@inkdrop.app>",
      "license": "MIT",
      "devDependencies": {
        "@inkdropapp/theme-dev-helpers": "^0.3.7"
      },
      "engines": {
        "inkdrop": "^5.9.0"
      },
      "dist": {
        "tarball": "https://api.inkdrop.app/v1/packages/solarized-dark-ui/versions/1.1.0/tarball"
      }
    }
  },
  "readme": "# Solarized Dark UI theme for Inkdrop\n\nA theme plugin that implements the Solarized Dark theme for [Inkdrop](https://www.inkdrop.app/).\n\n![screenshot](./docs/screenshot.png)\n",
  "metadata": {
    "name": "solarized-dark-ui",
    "version": "1.1.0",
    "theme": "ui",
    "themeAppearance": "dark",
    "type": "module",
    "description": "Solarized Dark UI Theme for Inkdrop",
    "styleSheets": ["tokens.css", "theme.css"],
    "scripts": {},
    "keywords": ["inkdrop", "markdown"],
    "repository": "https://github.com/inkdropapp/solarized-dark-ui",
    "author": "Takuya Matsuyama<t@inkdrop.app>",
    "license": "MIT",
    "devDependencies": {
      "@inkdropapp/theme-dev-helpers": "^0.3.7"
    },
    "engines": {
      "inkdrop": "^5.9.0"
    }
  }
}
```

### Get Package Version

```
GET /packages/:package_name/versions/:version_name
```

Returns information about a specific version of a package.

**Response:** Version object or `404` if version doesn't exist

#### Example

- `GET https://api.inkdrop.app/v1/packages/solarized-dark-ui/versions/1.1.0`

```json
{
  "name": "solarized-dark-ui",
  "version": "1.1.0",
  "theme": "ui",
  "themeAppearance": "dark",
  "type": "module",
  "description": "Solarized Dark UI Theme for Inkdrop",
  "styleSheets": ["tokens.css", "theme.css"],
  "scripts": {},
  "keywords": ["inkdrop", "markdown"],
  "repository": "https://github.com/inkdropapp/solarized-dark-ui",
  "author": "Takuya Matsuyama<t@inkdrop.app>",
  "license": "MIT",
  "devDependencies": {
    "@inkdropapp/theme-dev-helpers": "^0.3.7"
  },
  "engines": {
    "inkdrop": "^5.9.0"
  },
  "dist": {
    "tarball": "https://api.inkdrop.app/v1/packages/solarized-dark-ui/versions/1.1.0/tarball"
  }
}
```

### Download Package Tarball

```
GET /packages/:packageName/versions/:versionName/tarball
```

Downloads the package tarball for a specific version. Redirects to GitHub's tarball URL.

**Side Effects:**

- Increments download counter
- Posts milestone messages to Discord at 100, 500, and 1,000 downloads

## Package Object Structure

```json
{
  "name": "package-name",
  "created_at": 1234567890,
  "updated_at": 1234567890,
  "repository": "github-username/repository-name",
  "downloads": 0,
  "stargazers_count": 0,
  "releases": {
    "latest": "1.0.0"
  },
  "versions": {
    "1.0.0": {
      "name": "package-name",
      "version": "1.0.0",
      "dist": {
        "tarball": "https://api.inkdrop.app/v1/packages/package-name/versions/1.0.0/tarball"
      }
    }
  },
  "readme": "README content",
  "metadata": {},
  "owner": {
    "userId": "user-id",
    "firstName": "First",
    "lastName": "Last"
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

- `400` - Bad Request (invalid parameters, malformed data)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (package/version doesn't exist)
- `409` - Conflict (package already exists)
- `501` - Not Implemented

## Integration Features

- **GitHub Integration**: Packages are created from GitHub repositories
- **Discord Notifications**: New packages and updates are posted to Discord
- **Activity Feed**: Package events are tracked and displayed
- **Cache Management**: Responses are cached for performance
