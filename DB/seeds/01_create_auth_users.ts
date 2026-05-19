import { supabase } from '../../backend/src/lib/supabase.js';

const USERS = [
  { email: 'test-active@nerra.dev', password: 'Test1234!' },
  { email: 'test-resistance@nerra.dev', password: 'Test1234!' },
  { email: 'test-pilot@nerra.dev', password: 'Test1234!' },
  { email: 'test-genesis@nerra.dev', password: 'Test1234!' },
  { email: 'test-workshop@nerra.dev', password: 'Test1234!' },
  { email: 'test-tension@nerra.dev', password: 'Test1234!' },
  { email: 'test-cuisine@nerra.dev', password: 'Test1234!' },
  { email: 'test-feedback@nerra.dev', password: 'Test1234!' },
  { email: 'test-decline@nerra.dev', password: 'Test1234!' },
  { email: 'test-multiniche@nerra.dev', password: 'Test1234!' },
];

async function seedAuthUsers() {
  console.log("🚀 Démarrage de la création des utilisateurs Auth...");
  for (const user of USERS) {
    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`Erreur lors de la récupération des utilisateurs:`, listError);
      continue;
    }
    
    const exists = users.find(u => u.email === user.email);
    
    if (exists) {
      console.log(`⏩ Utilisateur ${user.email} existe déjà, on skip.`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`❌ Erreur création ${user.email}:`, error.message);
    } else {
      console.log(`✅ Utilisateur créé : ${user.email} (ID: ${data.user.id})`);
    }
  }
  console.log("🎉 Terminé !");
}

seedAuthUsers().catch(console.error);
