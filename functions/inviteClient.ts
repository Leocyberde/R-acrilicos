import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Apenas admins podem convidar clientes' }, { status: 403 });
        }

        const { email } = await req.json();

        if (!email) {
            return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        await base44.users.inviteUser(email, 'user');

        return Response.json({ success: true, message: `Cliente ${email} convidado com sucesso` });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});