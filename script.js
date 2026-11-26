// =====================================================================
// CONFIGURACIÓN DE SUPABASE
// =====================================================================
const SUPABASE_URL = 'https://xabokyvrtwfbgxqmlnvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f7dsq-vGuaAz-29RAC8tzQ_vFZO4G7L';

// Iniciar cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- NAVEGACIÓN Y UI ---
    const navbar = document.getElementById('navbar');
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('active')));

    // --- FORMULARIO DE CONTACTO ---
    document.getElementById('leadForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const group = document.getElementById('group').value;
        const message = document.getElementById('message').value;

        const waNumber = "51944565542";
        const waText = `¡Hola Los Peripatéticos! Quiero información.%0A%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Correo:* ${email}%0A*Grupo:* ${group}%0A*Consulta:* ${message}`;
        window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank');
        e.target.reset();
    });

    // --- PORTAL (AULA VIRTUAL) ---
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

    // --- AUTENTICACIÓN ---
    let currentUserRole = '';
    let currentUserName = '';
    let currentUserId = '';

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
            alert("Error: No se encontró tu perfil en la base de datos. Contacta al administrador.");
            return;
        }

        currentUserRole = profileData.role;
        currentUserName = profileData.full_name;
        currentUserId = profileData.id;

        document.getElementById('loginError').style.display = 'none';
        loginView.classList.remove('active');
        dashboardView.classList.add('active');
        
        document.getElementById('userNameDisplay').textContent = currentUserName;
        let roleText = currentUserRole === 'admin' ? 'Administrador' : (currentUserRole === 'teacher' ? 'Docente' : 'Estudiante');
        document.getElementById('userRoleDisplay').textContent = roleText;
        
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
        const name = document.getElementById('newName').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const age = document.getElementById('newAge').value;
        const dob = document.getElementById('newDob').value;
        const phone = document.getElementById('newPhone').value.trim();
        const pass = document.getElementById('newPass').value;

        // Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
            options: { 
                data: { 
                    full_name: name,
                    role: role,
                    age: age,
                    birth_date: dob,
                    phone: phone
                } 
            }
        });

        if (authError) {
            alert('Error al crear usuario: ' + authError.message);
            return;
        }

        alert('¡Usuario creado exitosamente! Contraseña: ' + pass + '\n\nPor seguridad, tu sesión de admin se ha cerrado. Vuelve a ingresar.');
        
        // Cerrar sesión porque Supabase inicia sesión como el nuevo usuario
        await supabaseClient.auth.signOut();
        closePortal();
    });

    const loadUsersTable = async () => {
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .neq('role', 'admin');

        if (error) return;
        
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
            const roleLabel = u.role === 'teacher' ? 'Docente' : 'Estudiante';
            tbody.innerHTML += `<tr><td>${roleLabel}</td><td>${u.email}</td><td>${u.full_name}</td></tr>`;
        });
    };

    // --- DOCENTE ---
    document.getElementById('uploadMaterialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('matTitle').value.trim();
        const type = document.getElementById('matType').value;
        const url = document.getElementById('matUrl').value.trim();

        const { error } = await supabaseClient
            .from('materials')
            .insert([{ title: title, type: type, file_url: url, created_by: currentUserId }]);

        if (error) {
            alert('Error al subir material: ' + error.message);
        } else {
            alert('Material publicado exitosamente.');
            e.target.reset();
            loadTeacherMaterials();
        }
    });

    const loadTeacherMaterials = async () => {
        const { data: materials, error } = await supabaseClient
            .from('materials')
            .select('*')
            .eq('created_by', currentUserId);

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
                        <span>${m.type === 'link' ? 'Enlace de Clase' : 'Material PDF'}</span>
                    </div>
                    <div class="material-actions">
                        <a href="${m.file_url}" target="_blank" title="Ver"><i class="fas fa-external-link-alt"></i></a>
                        <a href="#" onclick="deleteMaterial('${m.id}')" title="Eliminar" style="color:#e11d48;"><i class="fas fa-trash"></i></a>
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
        const { data: materials, error } = await supabaseClient
            .from('materials')
            .select('*');

        const list = document.getElementById('studentMaterialsList');
        
        if (error || materials.length === 0) {
            list.innerHTML = '<p class="empty-msg">Aún no hay materiales subidos por los docentes.</p>';
            return;
        }

        list.innerHTML = '';
        materials.forEach(m => {
            list.innerHTML += `
                <div class="material-item">
                    <div class="material-info">
                        <h6>${m.title}</h6>
                    </div>
                    <div class="material-actions">
                        <a href="${m.file_url}" target="_blank" class="btn-primary" style="padding:8px 15px; font-size:0.8rem;">
                            ${m.type === 'link' ? 'Ingresar a Clase' : 'Descargar Material'}
                        </a>
                    </div>
                </div>
            `;
        });
    };

    document.querySelectorAll('.btn-portal').forEach(btn => btn.addEventListener('click', openPortal));
});