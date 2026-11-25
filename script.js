document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INICIALIZACIÓN DE LA BASE DE DATOS (LocalStorage) ---
    const initDB = () => {
        if (!localStorage.getItem('lp_users')) {
            // Crear Admin por defecto
            const defaultUsers = [
                {
                    id: 'admin1',
                    role: 'admin',
                    username: '75827689',
                    password: '@PopeJhon26',
                    name: 'Administrador Principal',
                    email: 'admin@losperipateticos.com',
                    phone: '944565542'
                }
            ];
            localStorage.setItem('lp_users', JSON.stringify(defaultUsers));
        }
        if (!localStorage.getItem('lp_materials')) {
            localStorage.setItem('lp_materials', JSON.stringify([]));
        }
    };
    initDB();

    // --- 2. NAVEGACIÓN Y UI ---
    const navbar = document.getElementById('navbar');
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
    });

    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('active')));

    // --- 3. FORMULARIO DE CONTACTO (Redirección a WhatsApp) ---
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

    // --- 4. LÓGICA DEL PORTAL (AULA VIRTUAL) ---
    const portalModal = document.getElementById('portalModal');
    const loginView = document.getElementById('loginView');
    const dashboardView = document.getElementById('dashboardView');
    
    window.openPortal = () => {
        portalModal.classList.add('active');
        loginView.classList.add('active');
        dashboardView.classList.remove('active');
        document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo
    };

    window.closePortal = () => {
        portalModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('loginForm').reset();
        document.getElementById('loginError').style.display = 'none';
    };

    // Autenticación
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value;
        const pass = document.getElementById('loginPass').value;
        
        const users = JSON.parse(localStorage.getItem('lp_users'));
        const foundUser = users.find(u => u.username === user && u.password === pass);

        if (foundUser) {
            document.getElementById('loginError').style.display = 'none';
            loginView.classList.remove('active');
            dashboardView.classList.add('active');
            
            // Configurar Dashboard según Rol
            document.getElementById('userNameDisplay').textContent = foundUser.name;
            document.getElementById('userRoleDisplay').textContent = foundUser.role === 'admin' ? 'Administrador' : (foundUser.role === 'teacher' ? 'Docente' : 'Estudiante');
            
            // Ocultar todos los paneles
            document.getElementById('adminPanel').style.display = 'none';
            document.getElementById('teacherPanel').style.display = 'none';
            document.getElementById('studentPanel').style.display = 'none';

            // Mostrar panel correspondiente
            if (foundUser.role === 'admin') {
                document.getElementById('adminPanel').style.display = 'block';
                loadUsersTable();
            } else if (foundUser.role === 'teacher') {
                document.getElementById('teacherPanel').style.display = 'block';
                loadTeacherMaterials();
            } else {
                document.getElementById('studentPanel').style.display = 'block';
                loadStudentMaterials();
            }

        } else {
            document.getElementById('loginError').style.display = 'block';
        }
    });

    window.logout = () => {
        closePortal();
    };

    // --- 5. FUNCIONES DEL ADMINISTRADOR ---
    document.getElementById('createUserForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.getElementById('newRole').value;
        const username = document.getElementById('newUser').value;
        const name = document.getElementById('newName').value;
        const email = document.getElementById('newEmail').value;
        const age = document.getElementById('newAge').value;
        const dob = document.getElementById('newDob').value;
        const phone = document.getElementById('newPhone').value;
        const pass = document.getElementById('newPass').value;

        const users = JSON.parse(localStorage.getItem('lp_users'));
        
        if(users.find(u => u.username === username)) {
            alert('El usuario (DNI) ya existe.');
            return;
        }

        users.push({ id: Date.now().toString(), role, username, password: pass, name, email, age, dob, phone });
        localStorage.setItem('lp_users', JSON.stringify(users));
        
        alert('Usuario creado exitosamente. Contraseña provisional: 123456');
        e.target.reset();
        document.getElementById('newPass').value = '123456';
        loadUsersTable();
    });

    const loadUsersTable = () => {
        const users = JSON.parse(localStorage.getItem('lp_users'));
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
            if(u.role !== 'admin') {
                tbody.innerHTML += `<tr><td>${u.role === 'teacher' ? 'Docente' : 'Estudiante'}</td><td>${u.username}</td><td>${u.name}</td></tr>`;
            }
        });
    };

    // --- 6. FUNCIONES DEL DOCENTE ---
    document.getElementById('uploadMaterialForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('matTitle').value;
        const type = document.getElementById('matType').value;
        const url = document.getElementById('matUrl').value;

        const materials = JSON.parse(localStorage.getItem('lp_materials'));
        materials.push({ id: Date.now().toString(), title, type, url, date: new Date().toLocaleDateString() });
        localStorage.setItem('lp_materials', JSON.stringify(materials));
        
        alert('Material publicado exitosamente.');
        e.target.reset();
        loadTeacherMaterials();
    });

    const loadTeacherMaterials = () => {
        const materials = JSON.parse(localStorage.getItem('lp_materials'));
        const list = document.getElementById('teacherMaterialsList');
        list.innerHTML = materials.length === 0 ? '<p class="empty-msg">No has subido material aún.</p>' : '';
        
        materials.forEach(m => {
            list.innerHTML += `
                <div class="material-item">
                    <div class="material-info">
                        <h6>${m.title}</h6>
                        <span>${m.type === 'link' ? 'Enlace de Clase' : 'Material PDF'} | ${m.date}</span>
                    </div>
                    <div class="material-actions">
                        <a href="${m.url}" target="_blank" title="Ver"><i class="fas fa-external-link-alt"></i></a>
                        <a href="#" onclick="deleteMaterial('${m.id}')" title="Eliminar" style="color:#e11d48;"><i class="fas fa-trash"></i></a>
                    </div>
                </div>
            `;
        });
    };

    window.deleteMaterial = (id) => {
        if(confirm('¿Seguro que deseas eliminar este material?')) {
            let materials = JSON.parse(localStorage.getItem('lp_materials'));
            materials = materials.filter(m => m.id !== id);
            localStorage.setItem('lp_materials', JSON.stringify(materials));
            loadTeacherMaterials();
        }
    };

    // --- 7. FUNCIONES DEL ESTUDIANTE ---
    const loadStudentMaterials = () => {
        const materials = JSON.parse(localStorage.getItem('lp_materials'));
        const list = document.getElementById('studentMaterialsList');
        
        if(materials.length === 0) {
            list.innerHTML = '<p class="empty-msg">Aún no hay materiales subidos por los docentes.</p>';
            return;
        }

        list.innerHTML = '';
        materials.forEach(m => {
            list.innerHTML += `
                <div class="material-item">
                    <div class="material-info">
                        <h6>${m.title}</h6>
                        <span>Publicado: ${m.date}</span>
                    </div>
                    <div class="material-actions">
                        <a href="${m.url}" target="_blank" class="btn-primary" style="padding:8px 15px; font-size:0.8rem;">
                            ${m.type === 'link' ? 'Ingresar a Clase' : 'Descargar Material'}
                        </a>
                    </div>
                </div>
            `;
        });
    };

    // Asignar evento al botón de abrir portal
    document.querySelectorAll('.btn-portal').forEach(btn => btn.addEventListener('click', openPortal));
});