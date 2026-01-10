# Playwright E2E Testing Guide

## Setup

1. **Install Dependencies**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **VS Code Extension**
   - Install "Playwright Test for VSCode" extension
   - This provides test runner, debugging, and test generation features

## Running Tests

### Headless Mode (Default)
```bash
npm run test
```

### Headed Mode (Browser Visible)
```bash
npm run test:headed
```

### Debug Mode (Step-by-step debugging)
```bash
npm run test:debug
```

### UI Mode (Interactive test runner)
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npx playwright test homepage.spec.ts
```

### Run Specific Test
```bash
npx playwright test -g "should load homepage successfully"
```

## Test Reports

### Generate HTML Report
```bash
npm run test:report
```

### View Last Test Report
```bash
npx playwright show-report
```

## Test Configuration

The `playwright.config.ts` file contains:
- **Base URL**: Update this to your actual Vercel URL
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

## Test Files

- `homepage.spec.ts` - Tests homepage loading and Download App button
- `app-functionality.spec.ts` - Tests general app functionality

## Important Notes

1. **Update Base URL**: Change `baseURL` in `playwright.config.ts` to your actual Vercel URL
2. **Download Button**: Tests look for buttons with text "Download App" - update selectors if needed
3. **Mobile Testing**: Tests include mobile viewport testing
4. **Screenshots**: Saved in `test-results/` folder
5. **Reports**: HTML reports saved in `playwright-report/` folder

## Debugging Tips

1. Use `page.pause()` in tests to pause execution
2. Use `--debug` flag to step through tests
3. Check `test-results/` folder for screenshots and videos
4. Use browser dev tools in headed mode

## VS Code Integration

With the Playwright extension:
- Click the play button next to tests to run them
- Use breakpoints for debugging
- View test results in the Test Explorer
- Generate tests by recording user interactions
