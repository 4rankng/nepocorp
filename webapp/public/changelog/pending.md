## Local Storage Implementation

1. **Local Storage Service**

   - Implement localStorage as the database
   - Create `src/services/localStorage/` to manage localStorage interactions
   - Use `apiWrapper.js` to encapsulate all response to caller (aka localApi service)

2. **Data Model Implementation**

   - Implement data model defined in `./docs/Tables.md`
   - Bootstrap with initial sample data (once)
   - Maintain all field relationships between tables

3. **API Service Layer**

   - Create `src/services/localApi/` to interact with localStorage service
   - Ensure API contract matches production environment
   - Only difference from production: localStorage as backend

4. **Integration**
   - Update existing hooks and pages in `src/features/`
   - Connect components to use the new local API service
