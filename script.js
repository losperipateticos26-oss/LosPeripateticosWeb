/* =====================================================
   LOS PERIPATÉTICOS v2 — Lógica completa
   ===================================================== */
const SUPABASE_URL = 'https://xabokyvrtwfbgxqmlnvo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f7dsq-vGuaAz-29RAC8tzQ_vFZO4G7L';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* Catálogo de cursos por grupo */
const COURSES_BY_GROUP = {
  C: ['Competencia Comunicativa', 'Aritmética', 'Álgebra', 'Historia', 'Geografía', 'Economía', 'Educación Cívica'],
  D: ['Competencia Comunicativa', 'Aritmética', 'Álgebra', 'Historia', 'Geografía', 'Educación Cívica', 'Filosofía y Lógica']
};

/* Estado global */
const state = {
  user: null,
  role: '',
  name: '',
  group: '',
  coursesTaught: [],
  teachingDay: '',
  currentCourse: null,   // { course, group }
  currentTopic: null
};

/* Utilidades de fecha */
const DAY_INDEX = { DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6 };
const DAY_LABEL = { DOMINGO: 'Domingo', LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado' };
const CYCLE_START = new Date(2027, 0, 11); // 11 enero 2027
const SESSIONS_COUNT = 9;

function generateCycleDates(dayName) {
  const targetDay = DAY_INDEX[dayName];
  const dates = [];
  let cur = new Date(CYCLE_START);
  while (cur.getDay() !== targetDay) cur.setDate(cur.getDate() + 1);
  for (let i = 0; i < SESSIONS_COUNT; i++) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return dates;
}
function fmtDate(d) { return d.toISOString().split('T')[0]; }
function fmtDateES(d) {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const menuToggle = document.getElementById('mobile-menu');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
  menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
  document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => navLinks.classList.remove('active')));

  /* Contacto → WhatsApp */
  document.getElementById('leadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const group = document.getElementById('group').value;
    const message = document.getElementById('message').value;
    const waText = `¡Hola Los Peripatéticos! Quiero información.%0A%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Correo:* ${email}%0A*Interés:* ${group}%0A*Consulta:* ${message}`;
    window.open(`https://wa.me/51944565542?text=${waText}`, '_blank');
    e.target.reset();
  });

  /* Botones portal */
  document.querySelectorAll('.btn-portal').forEach(btn => btn.addEventListener('click', openPortal));

  /* Dinámica formulario admin */
  document.getElementById('newRole').addEventListener('change', toggleRoleFields);
  document.getElementById('newGroup').addEventListener('change', renderCourseCheckboxes);

  /* Submit login */
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  /* Submit crear usuario */
  document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);

  /* Submit crear tema */
  document.getElementById('createTopicForm').addEventListener('submit', handleCreateTopic);

  /* Submit añadir material */
  document.getElementById('addMaterialForm').addEventListener('submit', handleAddMaterial);
  document.getElementById('matType').addEventListener('change', toggleMaterialFields);

  /* Avatar */
  document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);
});

/* =====================================================
   PORTAL OPEN/CLOSE
   ===================================================== */
function openPortal() {
  document.getElementById('portalModal').classList.add('active');
  document.getElementById('loginView').classList.add('active');
  document.getElementById('dashboardView').classList.remove('active');
  document.body.style.overflow = 'hidden';
}
function closePortal() {
  document.getElementById('portalModal').classList.remove('active');
  document.body.style.overflow = 'auto';
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').style.display = 'none';
}

/* =====================================================
   LOGIN
   ===================================================== */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errBox = document.getElementById('loginError');

  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  if (authError) { errBox.textContent = 'Error: ' + authError.message; errBox.style.display = 'block'; return; }

  const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', authData.user.id).single();
  if (profileError || !profile) { alert('Error: no se encontró tu perfil.'); return; }

  state.user = authData.user;
  state.role = profile.role;
  state.name = profile.full_name;
  state.group = profile.group_assigned || '';
  state.coursesTaught = Array.isArray(profile.courses_taught) ? profile.courses_taught : [];
  state.teachingDay = profile.teaching_day || '';

  errBox.style.display = 'none';
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('dashboardView').classList.add('active');

  /* Header */
  document.getElementById('userNameDisplay').textContent = state.name;
  const roleText = state.role === 'admin' ? 'Administrador' : state.role === 'teacher' ? 'Docente' : 'Estudiante';
  document.getElementById('userRoleDisplay').textContent = roleText;

  const groupDisplay = document.getElementById('userGroupDisplay');
  if (state.role !== 'admin' && state.group) {
    groupDisplay.textContent = 'Grupo ' + state.group;
    groupDisplay.style.display = 'inline-block';
  } else groupDisplay.style.display = 'none';

  /* Avatar */
  const avatarEl = document.getElementById('avatarDisplay');
  if (profile.avatar_url) avatarEl.innerHTML = `<img src="${profile.avatar_url}?t=${Date.now()}" alt="avatar">`;
  else avatarEl.innerHTML = '<i class="fas fa-user-circle"></i>';

  /* Área admin */
  document.getElementById('adminArea').style.display = state.role === 'admin' ? 'block' : 'none';

  /* Reset vistas */
  document.getElementById('dashboardHome').style.display = 'block';
  document.getElementById('courseView').style.display = 'none';
  document.getElementById('topicView').style.display = 'none';
  document.getElementById('attendanceView').style.display = 'none';

  renderNotebooks();
  if (state.role === 'admin') loadUsersTable();
}

async function logout() {
  await supabaseClient.auth.signOut();
  state.user = null;
  closePortal();
}

/* =====================================================
   AVATAR
   ===================================================== */
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const path = `${state.user.id}/avatar.${file.name.split('.').pop()}`;
  const { error } = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) { alert('Error al subir avatar: ' + error.message); return; }
  const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
  const url = urlData.publicUrl;
  await supabaseClient.from('profiles').update({ avatar_url: url }).eq('id', state.user.id);
  document.getElementById('avatarDisplay').innerHTML = `<img src="${url}?t=${Date.now()}" alt="avatar">`;
}

/* =====================================================
   ADMIN — CREAR USUARIO
   ===================================================== */
function toggleRoleFields() {
  const role = document.getElementById('newRole').value;
  document.getElementById('coursesCheckboxContainer').style.display = role === 'teacher' ? 'block' : 'none';
  document.getElementById('guardianSection').style.display = role === 'student' ? 'block' : 'none';
  if (role === 'teacher') renderCourseCheckboxes();
}

function renderCourseCheckboxes() {
  const group = document.getElementById('newGroup').value;
  const container = document.getElementById('coursesCheckboxes');
  const courses = COURSES_BY_GROUP[group] || [];
  container.innerHTML = courses.map(c => `
    <label><input type="checkbox" value="${c}"> ${c}</label>
  `).join('');
}

async function handleCreateUser(e) {
  e.preventDefault();
  const role = document.getElementById('newRole').value;
  const group = document.getElementById('newGroup').value;
  const day = document.getElementById('newTeachingDay').value;
  const name = document.getElementById('newName').value.trim();
  const dob = document.getElementById('newDob').value;
  const email = document.getElementById('newEmail').value.trim();
  const phone = document.getElementById('newPhone').value.trim();
  const pass = document.getElementById('newPass').value;

  let coursesTaught = [];
  if (role === 'teacher') {
    const checks = document.querySelectorAll('#coursesCheckboxes input:checked');
    if (checks.length === 0) { alert('Selecciona al menos un curso para el docente.'); return; }
    coursesTaught = [...checks].map(c => ({ course: c.value, group, day }));
  }

  const g1Name = document.getElementById('newGuardian1Name').value.trim();
  const g1Phone = document.getElementById('newGuardian1Phone').value.trim();
  const g2Name = document.getElementById('newGuardian2Name').value.trim();
  const g2Phone = document.getElementById('newGuardian2Phone').value.trim();

  if (role === 'student' && (!g1Name || !g1Phone)) {
    alert('El Apoderado 1 es obligatorio para estudiantes.');
    return;
  }

  const metadata = {
    full_name: name, role, group_assigned: group, birth_date: dob, phone,
    teaching_day: role === 'teacher' ? day : null,
    courses_taught: coursesTaught,
    guardian1_name: g1Name, guardian1_phone: g1Phone,
    guardian2_name: g2Name, guardian2_phone: g2Phone
  };

  // 1. Creamos el usuario en el sistema de Autenticación
  const { data: authData, error: authError } = await supabaseClient.auth.signUp({ 
    email, 
    password: pass, 
    options: { data: metadata } 
  });
  
  if (authError) { 
    alert('Error al crear usuario: ' + authError.message); 
    return; 
  }

  // 2. Guardamos los datos del perfil manualmente (Evita el error del trigger de BD)
  if (authData.user) {
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert([{
        id: authData.user.id,
        full_name: name,
        email: email,
        role: role,
        group_assigned: group,
        birth_date: dob,
        phone: phone,
        teaching_day: role === 'teacher' ? day : null,
        courses_taught: coursesTaught,
        guardian1_name: g1Name,
        guardian1_phone: g1Phone,
        guardian2_name: g2Name,
        guardian2_phone: g2Phone
      }]);

    if (profileError) {
      alert('Usuario creado en el sistema, pero hubo un error al guardar su perfil: ' + profileError.message);
    }
  }

  alert(`¡Usuario creado exitosamente!\n\nCorreo: ${email}\nContraseña: ${pass}\nRol: ${role}\nGrupo: ${group}\n\n(El sistema cerrará tu sesión por seguridad. Vuelve a entrar con tu cuenta de admin).`);
  
  await supabaseClient.auth.signOut();
  closePortal();
}

async function loadUsersTable() {
  const { data: users, error } = await supabaseClient.from('profiles').select('*').neq('role', 'admin').order('full_name');
  if (error) return;
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const roleLabel = u.role === 'teacher' ? 'Docente' : 'Estudiante';
    const groupLabel = u.group_assigned || 'N/A';
    tbody.innerHTML += `<tr><td>${roleLabel}</td><td>${u.full_name}</td><td>${u.email}</td><td>${groupLabel}</td></tr>`;
  });
}

/* =====================================================
   CUADERNOS
   ===================================================== */
async function renderNotebooks() {
  const grid = document.getElementById('notebooksGrid');
  grid.innerHTML = '<p class="empty-msg">Cargando cuadernos...</p>';

  let notebooks = [];

  if (state.role === 'admin') {
    const all = [];
    for (const [g, list] of Object.entries(COURSES_BY_GROUP)) list.forEach(c => all.push({ course: c, group: g }));
    notebooks = all;
  } else if (state.role === 'teacher') {
    notebooks = state.coursesTaught.map(c => ({ course: c.course, group: c.group }));
  } else {
    const list = COURSES_BY_GROUP[state.group] || [];
    notebooks = list.map(c => ({ course: c, group: state.group }));
  }

  if (notebooks.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No hay cuadernos asignados aún. Contacta al administrador.</p>';
    return;
  }

  /* Iconos por curso */
  const icons = {
    'Competencia Comunicativa': 'fa-feather-alt',
    'Aritmética': 'fa-calculator',
    'Álgebra': 'fa-square-root-alt',
    'Historia': 'fa-landmark',
    'Geografía': 'fa-globe-americas',
    'Economía': 'fa-chart-line',
    'Educación Cívica': 'fa-balance-scale',
    'Filosofía y Lógica': 'fa-brain'
  };

  grid.innerHTML = '';
  for (const nb of notebooks) {
    const { count } = await supabaseClient
      .from('topics')
      .select('id', { count: 'exact', head: true })
      .eq('course_name', nb.course)
      .eq('group_name', nb.group);

    grid.innerHTML += `
      <div class="notebook-card" onclick="openCourseView('${nb.course.replace(/'/g, "\\'")}', '${nb.group}')">
        <div class="notebook-icon"><i class="fas ${icons[nb.course] || 'fa-book'}"></i></div>
        <h3>${nb.course}</h3>
        <span class="group-tag">Grupo ${nb.group}</span>
        <div class="notebook-meta"><i class="fas fa-layer-group"></i> ${count || 0} tema${(count === 1 ? '' : 's')} publicado${(count === 1 ? '' : 's')}</div>
      </div>`;
  }
}

/* =====================================================
   VISTA CURSO
   ===================================================== */
async function openCourseView(course, group) {
  state.currentCourse = { course, group };
  document.getElementById('dashboardHome').style.display = 'none';
  document.getElementById('courseView').style.display = 'block';
  document.getElementById('topicView').style.display = 'none';
  document.getElementById('attendanceView').style.display = 'none';

  document.getElementById('courseDetailTitle').textContent = course;
  document.getElementById('courseDetailSubtitle').textContent = `Grupo ${group} · Ciclo Verano 2027`;

  const canEdit = state.role === 'admin' || state.role === 'teacher';
  document.getElementById('createTopicCard').style.display = canEdit ? 'block' : 'none';
  document.getElementById('openAttendanceBtn').style.display = canEdit ? 'inline-flex' : 'none';

  /* Por defecto, session number */
  const { count } = await supabaseClient
    .from('topics').select('id', { count: 'exact', head: true })
    .eq('course_name', course).eq('group_name', group);
  document.getElementById('topicSession').value = (count || 0) + 1;

  await loadTopics();
}

function closeCourseView() {
  state.currentCourse = null;
  document.getElementById('courseView').style.display = 'none';
  document.getElementById('dashboardHome').style.display = 'block';
  renderNotebooks();
}

async function loadTopics() {
  const list = document.getElementById('topicsList');
  if (!state.currentCourse) return;
  list.innerHTML = '<p class="empty-msg">Cargando temas...</p>';
  const { data: topics, error } = await supabaseClient
    .from('topics').select('*')
    .eq('course_name', state.currentCourse.course)
    .eq('group_name', state.currentCourse.group)
    .order('session_number', { ascending: true });

  if (error || !topics || topics.length === 0) {
    list.innerHTML = '<p class="empty-msg">Aún no hay temas publicados. ' + (state.role === 'student' ? 'El docente los añadirá pronto.' : '') + '</p>';
    return;
  }

  const canEdit = state.role === 'admin' || state.role === 'teacher';
  list.innerHTML = '';
  topics.forEach(t => {
    list.innerHTML += `
      <div class="topic-card" onclick="openTopicView('${t.id}')">
        <div>
          <h4>Tema ${t.session_number}: ${escapeHtml(t.title)}</h4>
          <div class="topic-meta">
            <span><i class="fas fa-calendar"></i> ${t.session_date || 'Sin fecha'}</span>
            ${t.description ? `<span><i class="fas fa-align-left"></i> ${escapeHtml(t.description.substring(0, 60))}${t.description.length > 60 ? '...' : ''}</span>` : ''}
          </div>
        </div>
        ${canEdit ? `<div class="topic-actions" onclick="event.stopPropagation();">
          <button class="delete" onclick="deleteTopic('${t.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>` : ''}
      </div>`;
  });
}

async function handleCreateTopic(e) {
  e.preventDefault();
  if (!state.currentCourse) return;
  const title = document.getElementById('topicTitle').value.trim();
  const session = parseInt(document.getElementById('topicSession').value);
  const date = document.getElementById('topicDate').value;
  const desc = document.getElementById('topicDesc').value.trim();

  const { error } = await supabaseClient.from('topics').insert([{
    course_name: state.currentCourse.course,
    group_name: state.currentCourse.group,
    title, session_number: session, session_date: date, description: desc,
    created_by: state.user.id
  }]);

  if (error) { alert('Error al crear tema: ' + error.message); return; }
  e.target.reset();
  /* Recalcular siguiente sesión */
  const { count } = await supabaseClient.from('topics').select('id', { count: 'exact', head: true })
    .eq('course_name', state.currentCourse.course).eq('group_name', state.currentCourse.group);
  document.getElementById('topicSession').value = (count || 0) + 1;
  loadTopics();
}

async function deleteTopic(id) {
  if (!confirm('¿Eliminar este tema y todos sus recursos?')) return;
  await supabaseClient.from('materials').delete().eq('topic_id', id);
  await supabaseClient.from('topics').delete().eq('id', id);
  loadTopics();
}

/* =====================================================
   VISTA TEMA
   ===================================================== */
async function openTopicView(topicId) {
  const { data: t } = await supabaseClient.from('topics').select('*').eq('id', topicId).single();
  if (!t) return;
  state.currentTopic = t;
  document.getElementById('courseView').style.display = 'none';
  document.getElementById('topicView').style.display = 'block';

  document.getElementById('topicViewTitle').textContent = `Tema ${t.session_number}: ${t.title}`;
  document.getElementById('topicViewMeta').textContent = `Sesión del ${t.session_date || 'sin fecha'} · ${state.currentCourse.course} · Grupo ${state.currentCourse.group}`;
  document.getElementById('topicViewDesc').textContent = t.description || '';

  const canEdit = state.role === 'admin' || state.role === 'teacher';
  document.getElementById('addMaterialCard').style.display = canEdit ? 'block' : 'none';
  await loadMaterials();
}

function closeTopicView() {
  state.currentTopic = null;
  document.getElementById('topicView').style.display = 'none';
  document.getElementById('courseView').style.display = 'block';
}

function toggleMaterialFields() {
  const t = document.getElementById('matType').value;
  document.getElementById('fileUploadGroup').style.display = ['pdf', 'word', 'ppt'].includes(t) ? 'block' : 'none';
  document.getElementById('urlGroup').style.display = t === 'link' ? 'block' : 'none';
  document.getElementById('textGroup').style.display = t === 'text' ? 'block' : 'none';
}

async function loadMaterials() {
  const list = document.getElementById('materialsList');
  if (!state.currentTopic) return;
  list.innerHTML = '<p class="empty-msg">Cargando recursos...</p>';
  const { data: mats, error } = await supabaseClient
    .from('materials').select('*').eq('topic_id', state.currentTopic.id)
    .order('created_at', { ascending: true });

  if (error || !mats || mats.length === 0) {
    list.innerHTML = '<p class="empty-msg">Este tema aún no tiene recursos publicados.</p>';
    return;
  }

  const canEdit = state.role === 'admin' || state.role === 'teacher';
  const typeIcon = { pdf: 'fa-file-pdf', word: 'fa-file-word', ppt: 'fa-file-powerpoint', link: 'fa-link', text: 'fa-align-left' };
  const typeLabel = { pdf: 'PDF', word: 'Word', ppt: 'PowerPoint', link: 'Enlace', text: 'Aviso' };

  list.innerHTML = '';
  mats.forEach(m => {
    const hasUrl = m.file_url || m.content;
    const isText = m.type === 'text';
    list.innerHTML += `
      <div class="material-item">
        <div class="material-info">
          <h6>${escapeHtml(m.title)}</h6>
          <div class="meta"><i class="fas ${typeIcon[m.type] || 'fa-file'}"></i> ${typeLabel[m.type] || m.type}</div>
          ${isText && m.content ? `<p style="margin-top:8px;color:var(--text-muted);font-size:.9rem;">${escapeHtml(m.content)}</p>` : ''}
        </div>
        <div class="material-actions">
          ${hasUrl && !isText ? `<a href="${m.file_url}" target="_blank" title="Abrir"><i class="fas fa-external-link-alt"></i></a>` : ''}
          ${canEdit ? `<button class="delete" onclick="deleteMaterial('${m.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>`;
  });
}

async function handleAddMaterial(e) {
  e.preventDefault();
  if (!state.currentTopic) return;
  const title = document.getElementById('matTitle').value.trim();
  const type = document.getElementById('matType').value;
  let file_url = null, content = null;

  if (['pdf', 'word', 'ppt'].includes(type)) {
    const fileInput = document.getElementById('matFile');
    if (!fileInput.files[0]) { alert('Selecciona un archivo.'); return; }
    const file = fileInput.files[0];
    const path = `${state.currentCourse.group}/${state.currentCourse.course}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabaseClient.storage.from('materials').upload(path, file);
    if (upErr) { alert('Error al subir archivo: ' + upErr.message); return; }
    const { data: urlData } = supabaseClient.storage.from('materials').getPublicUrl(path);
    file_url = urlData.publicUrl;
  } else if (type === 'link') {
    file_url = document.getElementById('matUrl').value.trim();
    if (!file_url) { alert('Ingresa una URL.'); return; }
  } else if (type === 'text') {
    content = document.getElementById('matContent').value.trim();
    if (!content) { alert('Ingresa el contenido del aviso.'); return; }
  }

  const { error } = await supabaseClient.from('materials').insert([{
    topic_id: state.currentTopic.id,
    title, type, file_url, content,
    course_name: state.currentCourse.course,
    target_group: state.currentCourse.group,
    created_by: state.user.id
  }]);

  if (error) { alert('Error al publicar recurso: ' + error.message); return; }
  e.target.reset();
  toggleMaterialFields();
  loadMaterials();
}

async function deleteMaterial(id) {
  if (!confirm('¿Eliminar este recurso?')) return;
  await supabaseClient.from('materials').delete().eq('id', id);
  loadMaterials();
}

/* =====================================================
   ASISTENCIA
   ===================================================== */
async function openAttendanceView() {
  document.getElementById('courseView').style.display = 'none';
  document.getElementById('attendanceView').style.display = 'block';
  document.getElementById('attendanceTitle').textContent = `Asistencia — ${state.currentCourse.course} (Grupo ${state.currentCourse.group})`;

  /* Día de dictado: lo saca del courses_taught del teacher; si admin, del primer match */
  let day = null;
  if (state.role === 'teacher') {
    const match = state.coursesTaught.find(c => c.course === state.currentCourse.course && c.group === state.currentCourse.group);
    day = match?.day || state.teachingDay;
  } else {
    /* Admin: pedir día */
    const input = prompt('Día de dictado de este curso (LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO):', 'MIERCOLES');
    day = (input || '').toUpperCase();
    if (!DAY_INDEX.hasOwnProperty(day)) { alert('Día inválido.'); closeAttendanceView(); return; }
  }
  if (!day) { alert('No se encontró día de dictado para este curso.'); closeAttendanceView(); return; }

  await renderAttendanceTable(day);
}

function closeAttendanceView() {
  document.getElementById('attendanceView').style.display = 'none';
  document.getElementById('courseView').style.display = 'block';
}

async function renderAttendanceTable(day) {
  const wrapper = document.getElementById('attendanceTableWrapper');
  wrapper.innerHTML = '<p class="empty-msg">Cargando...</p>';

  const dates = generateCycleDates(day);

  /* Asegurar sesiones creadas */
  for (const d of dates) {
    await supabaseClient.from('attendance_sessions').upsert([{
      course_name: state.currentCourse.course,
      group_name: state.currentCourse.group,
      session_date: fmtDate(d),
      teacher_id: state.user.id
    }], { onConflict: 'course_name,group_name,session_date' });
  }

  /* Traer sesiones */
  const { data: sessions } = await supabaseClient
    .from('attendance_sessions').select('*')
    .eq('course_name', state.currentCourse.course)
    .eq('group_name', state.currentCourse.group)
    .in('session_date', dates.map(fmtDate))
    .order('session_date');

  if (!sessions || sessions.length === 0) { wrapper.innerHTML = '<p class="empty-msg">No se pudieron crear las sesiones.</p>'; return; }

  /* Traer estudiantes del grupo (solo estudiantes) */
  const { data: students } = await supabaseClient
    .from('profiles').select('id, full_name')
    .eq('role', 'student').eq('group_assigned', state.currentCourse.group)
    .order('full_name');

  if (!students || students.length === 0) { wrapper.innerHTML = '<p class="empty-msg">Aún no hay estudiantes registrados en este grupo.</p>'; return; }

  /* Traer records */
  const sessionIds = sessions.map(s => s.id);
  const { data: records } = await supabaseClient
    .from('attendance_records').select('*').in('session_id', sessionIds);

  const recMap = {};
  (records || []).forEach(r => { recMap[`${r.session_id}_${r.student_id}`] = r.status; });

  /* Construir tabla */
  let html = '<table class="attendance-table"><thead><tr><th>Apellidos y Nombres</th>';
  dates.forEach(d => {
    html += `<th class="date-header">${fmtDateES(d)}</th>`;
  });
  html += '</tr></thead><tbody>';

  students.forEach(st => {
    html += `<tr><td>${escapeHtml(st.full_name)}</td>`;
    sessions.forEach(s => {
      const status = recMap[`${s.id}_${st.id}`] || null;
      const cls = status === 'present' ? 'present' : status === 'absent' ? 'absent' : '';
      html += `<td><span class="dot ${cls}" data-session="${s.id}" data-student="${st.id}" onclick="toggleAttendance(this)"></span></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrapper.innerHTML = html;
}

async function toggleAttendance(el) {
  const sessionId = el.dataset.session;
  const studentId = el.dataset.student;
  let status = 'absent';
  if (el.classList.contains('present')) status = 'absent';
  else status = 'present';

  el.classList.remove('present', 'absent');
  el.classList.add(status);

  await supabaseClient.from('attendance_records').upsert([{
    session_id: sessionId, student_id: studentId, status
  }], { onConflict: 'session_id,student_id' });
}

/* =====================================================
   UTILIDADES
   ===================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}