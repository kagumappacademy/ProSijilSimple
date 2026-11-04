// Test-only fixture: cloud authentication must read the primary admin table.
export async function seedCloudAdmin(remote,db){
  const admin=db.prepare('SELECT id,username,password_hash,created_at FROM admin_users LIMIT 1').get();
  await remote.execute({sql:'INSERT INTO admin_users(id,username,password_hash,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING',args:[admin.id,admin.username,admin.password_hash,admin.created_at]});
}
