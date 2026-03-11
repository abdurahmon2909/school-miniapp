from aiogram.fsm.state import State, StatesGroup


class RegistrationStates(StatesGroup):
    choosing_role = State()

    choosing_student_class = State()
    choosing_student_name = State()

    choosing_teacher_subject = State()
    choosing_teacher_name = State()