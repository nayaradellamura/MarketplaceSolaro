function openFormularioModal() {
  var loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
  if (loginModal) {
      loginModal.hide();
  }

  var myModal = new bootstrap.Modal(document.getElementById('modal'));
  myModal.show();
}

function closeFormularioModal() {
  var myModal = bootstrap.Modal.getInstance(document.getElementById('modal'));
  myModal.hide();
}

function openLoginModal() {
  var formularioModal = bootstrap.Modal.getInstance(document.getElementById('modal'));
  if (formularioModal) {
      formularioModal.hide();
  }

  var modal = new bootstrap.Modal(document.getElementById('loginModal'));
  modal.show();
}

function closeLoginModal() {
  var modalEl = document.getElementById('loginModal');
  var modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
}

function validarLogin() {
  const email = document.getElementById('usuario').value;
  const senha = document.getElementById('senha').value;

  if (!email || !senha) {
      alert('Por favor, preencha todos os campos.');
      return;
  }

  alert('Login enviado!');
}

