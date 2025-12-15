import { entities } from './db/schema/unified-entities.js';
import { systemDbConnection } from './db/index.js';
async function retrieveCreditConfigurations() {
  try {
   
    //fetched all the global credit configurations
      const result = await systemDbConnection 
      .select().from(entities)

      console.log('✅ Result:', result);
    

      // //i want to update the global credit configurations costs of all operations in lead module
      // const updatedResult = await systemDbConnection
      //   .update(creditConfigurations)
      //   .set({ creditCost: '10.0000' })
      //   .where(sql`${creditConfigurations.operationCode} LIKE '%leads%'`)
      //   .where(eq(creditConfigurations.isGlobal, true))
      //   .returning();
      // console.log('✅ Updated result:', updatedResult);
     

  } catch (error) {
    console.error('❌ Error fetching credit configurations:', error);
  } 
}
retrieveCreditConfigurations();