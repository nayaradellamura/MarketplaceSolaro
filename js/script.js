function openModal() {
    var myModal = new bootstrap.Modal(document.getElementById('modal'));
    myModal.show();
  }
  
  function closeModal() {
    var myModal = bootstrap.Modal.getInstance(document.getElementById('modal'));
    myModal.hide();
  }
  