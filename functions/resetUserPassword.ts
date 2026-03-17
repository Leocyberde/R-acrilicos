export default async function resetUserPassword(params) {
  const { email, newPassword } = params;

  if (!email || !newPassword) {
    return {
      success: false,
      error: "Email e nova senha são obrigatórios"
    };
  }

  try {
    // Redefinir a senha do usuário
    await base44.asServiceRole.auth.resetPassword(email, newPassword);
    
    return {
      success: true,
      message: "Senha redefinida com sucesso"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Erro ao redefinir a senha"
    };
  }
}