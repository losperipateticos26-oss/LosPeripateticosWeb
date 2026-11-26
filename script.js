// =====================================================================
// CONFIGURACIÓN DE SUPABASE
// =====================================================================
const SUPABASE_URL = 'https://xabokyvrtwfbgxqmlnvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f7dsq-vGuaAz-29RAC8tzQ_vFZO4G7L';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- UI Y NAVEGACIÓN ---
    const navbar = document.getElementById('navbar');
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('active')));

    // --- CONTACTO ---
    document.getElementById('leadForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const group = document.getElementById('group').value;
        const message = document.getElementById('message').value;

        const waNumber = "51944565542";
        const waText = `¡Hola Los Peripatéticos! Quiero información.%0A%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Correo:* ${email}%0A*Interés:* ${group}%0A*Consulta:* ${message}`;
        window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
        e.target.reset();
    });

    // --- LÓGICA DEL PORTAL ---
    const portalModal = document.getElementById('portalModal');
    const loginView = document.getElementById('loginView');
    const dashboardView = document.getElementById('dashboardView');
    
    window.openPortal = () => {
        portalModal.classList.add('active');
        loginView.classList.add('active');
        dashboardView.classList.remove('active');
        document.body.style.overflow = 'hidden';
    };

    window.closePortal = () => {
        portalModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
    };

    // --- VARIABLES DE SESIÓN ---
    let currentUserRole = '';
    let currentUserName = '';
    let currentUserId = '';
    let currentUserGroup = '';

    // Mostrar/Ocultar campo de grupo según el rol seleccionado
    document.getElementById('newRole').addEventListener('change', (e) => {
        const groupContainer = document.getElementById('groupAssignContainer');
        if (e.target.value === 'teacher') {
            groupContainer.style.display = 'block'; // Docentes también pueden tener grupo (o "Ambos")
        } else {
            groupContainer.style.display = 'block';
        }
    });

    // --- LOGIN ---
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if (authError) {
            document.getElementById('loginError').textContent = "Error: " + authError.message;
            document.getElementById('loginError').style.display = 'block';
            return;
        }

        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profileData) {
            alert("Error: No se encontró tu perfil. Contacta al administrador.");
            return;
        }

        currentUserRole = profileData.role;
        currentUserName = profileData.full_name;
        currentUserId = profileData.id;
        currentUserGroup = profileData.group_assigned || 'N/A';

        document.getElementById('loginError').style.display = 'none';
        loginView.classList.remove('active');
        dashboardView.classList.add('active');
        
        // Actualizar UI del Dashboard
        document.getElementById('userNameDisplay').textContent = currentUserName;
        let roleText = currentUserRole === 'admin' ? 'Administrador' : (currentUserRole === 'teacher' ? 'Docente' : 'Estudiante');
        document.getElementById('userRoleDisplay').textContent = roleText;
        
        const groupDisplay = document.getElementById('userGroupDisplay');
        if (currentUserRole !== 'admin' && currentUserGroup !== 'N/A') {
            groupDisplay.textContent = 'Grupo: ' + currentUserGroup;
            groupDisplay.style.display = 'inline-block';
        } else {
            groupDisplay.style.display = 'none';
        }
        
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('teacherPanel').style.display = 'none';
        document.getElementById('studentPanel').style.display = 'none';

        if (currentUserRole === 'admin') {
            document.getElementById('adminPanel').style.display = 'block';
            loadUsersTable();
        } else if (currentUserRole === 'teacher') {
            document.getElementById('teacherPanel').style.display = 'block';
            loadTeacherMaterials();
        } else {
            document.getElementById('studentPanel').style.display = 'block';
            loadStudentMaterials();
        }
    });

    window.logout = async () => {
        await supabaseClient.auth.signOut();
        closePortal();
    };

    // --- ADMINISTRADOR ---
    document.getElementById('createUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('newRole').value;
        const group = document.getElementById('newGroup').value;
        const name = document.getElementById('newName').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const pass = document.getElementById('newPass').value;

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
            options: { 
                data: { 
                    full_name: name, 
                    role: role,
                    group_assigned: group
                } 
            }
        });

        if (authError) {
            alert('Error al crear usuario: ' + authError.message);
            return;
        }

        alert('¡Usuario creado exitosamente!\n\nCorreo: ' + email + '\nContraseña: ' + pass + '\nGrupo: ' + group + '\n\n(El sistema cerrará tu sesión por seguridad. Vuelve a entrar con tu cuenta de admin).');
        
        await supabaseClient.auth.signOut();
        closePortal();
    });

    const loadUsersTable = async () => {
        const { data: users, error } = await supabaseClient.from('profiles').select('*').neq('role', 'admin');
        if (error) return;
        
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
            const roleLabel = u.role === 'teacher' ? 'Docente' : 'Estudiante';
            const groupLabel = u.group_assigned || 'N/A';
            tbody.innerHTML += `<tr><td>${roleLabel}</td><td>${u.full_name}</td><td>${u.email}</td><td>${groupLabel}</td></tr>`;
        });
    };

    // --- DOCENTE ---
    document.getElementById('uploadMaterialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('matTitle').value.trim();
        const course = document.getElementById('matCourse').value;
        const targetGroup = document.getElementById('matGroup').value;
        const type = document.getElementById('matType').value;
        const url = document.getElementById('matUrl').value.trim();

        const { error } = await supabaseClient.from('materials').insert([{ 
            title: title, 
            course_name: course,
            target_group: targetGroup,
            type: type, 
            file_url: url, 
            created_by: currentUserId 
        }]);

        if (error) {
            alert('Error al subir material: ' + error.message);
        } else {
            alert('Material publicado exitosamente.');
            e.target.reset();
            loadTeacherMaterials();
        }
    });

    const loadTeacherMaterials = async () => {
        const { data: materials, error } = await supabaseClient.from('materials').select('*').eq('created_by', currentUserId).order('created_at', { ascending: false });
        const list = document.getElementById('teacherMaterialsList');
        
        if (error || materials.length === 0) {
            list.innerHTML = '<p class="empty-msg">No has subido material aún.</p>';
            return;
        }

        list.innerHTML = '';
        materials.forEach(m => {
            list.innerHTML += `
                <div class="material-item">
                    <div class="material-info">
                        <h6>${m.title}</h6>
                        <div class="meta">
                            <span><i class="fas fa-book"></i> ${m.course_name}</span>
                            <span><i class="fas fa-users"></i> Grupo ${m.target_group}</span>
                            <span><i class="fas ${m.type === 'link' ? 'fa-link' : 'fa-file-pdf'}"></i> ${m.type === 'link' ? 'Enlace' : 'PDF'}</span>
                        </div>
                    </div>
                    <div class="material-actions">
                        <a href="${m.file_url}" target="_blank" title="Ver"><i class="fas fa-external-link-alt"></i></a>
                        <a href="#" onclick="deleteMaterial('${m.id}')" class="delete" title="Eliminar"><i class="fas fa-trash"></i></a>
                    </div>
                </div>
            `;
        });
    };

    window.deleteMaterial = async (id) => {
        if(confirm('¿Seguro que deseas eliminar este material?')) {
            await supabaseClient.from('materials').delete().eq('id', id);
            loadTeacherMaterials();
        }
    };

    // --- ESTUDIANTE ---
    const loadStudentMaterials = async () => {
        // El estudiante ve materiales donde el grupo sea su grupo O "BOTH" (Ambos)
        const { data: materials, error } = await supabaseClient
            .from('materials')
            .select('*')
            .or(`target_group.eq.${currentUserGroup},target_group.eq.BOTH`)
            .order('created_at', { ascending: false });

        const list = document.getElementById('studentMaterialsList');
        
        if (error || materials.length === 0) {
            list.innerHTML = '<p class="empty-msg">Aún no hay materiales subidos para tu grupo.</p>';
            return;
        }

        list.innerHTML = '';
        materials.forEach(m => {
            list.innerHTML += `
                <div class="material-item">
                    <div class="material-info">
                        <h6>${m.title}</h6>
                        <div class="meta">
                            <span><i class="fas fa-book"></i> ${m.course_name}</span>
                            <span><i class="fas ${m.type === 'link' ? 'fa-link' : 'fa-file-pdf'}"></i> ${m.type === 'link' ? 'Enlace de Clase' : 'Material de Estudio'}</span>
                        </div>
                    </div>
                    <div class="material-actions">
                        <a href="${m.file_url}" target="_blank" class="btn-primary" style="padding:10px 20px; font-size:0.8rem; border-radius:0;">
                            ${m.type === 'link' ? 'Ingresar' : 'Descargar'}
                        </a>
                    </div>
                </div>
            `;
        });
    };

    document.querySelectorAll('.btn-portal').forEach(btn => btn.addEventListener('click', openPortal));
});