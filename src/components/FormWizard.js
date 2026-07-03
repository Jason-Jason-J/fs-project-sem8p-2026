export class FormWizard {
  constructor() {
    this.currentStep = 0;
    const nextBtn = document.querySelector('#nextBtn');
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.nextStep();
      });
    }
  }

  nextStep() {
    this.currentStep += 1;
    console.log(`Advanced to step: ${this.currentStep}`);
  }
}