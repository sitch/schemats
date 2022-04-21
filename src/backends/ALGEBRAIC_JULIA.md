# Algebraic Julia

```julia
@present TrainingSchema <: TheorySQL begin
   # Tables
   split::Ob
   extract::Ob
   train::Ob
   evaluate::Ob

   # Columns of tables
   extract_1_Files1::Attr(extract, String)
   extract_2_Images2::Attr(extract, String)

   split_1_Images1::Attr(split, String)
   split_2_Images2::Attr(split, String)
   split_3_Images3::Attr(split, String)

   train_1_NeuralNet1::Attr(train, NeuralNet)
   train_2_Images2::Attr(train, Images)
   train_3_NeuralNet3::Attr(train, NeuralNet)
   train_4_Metadata4::Attr(train, Metadata)

   evaluate_1_NeuralNet1::Attr(evaluate, NeuralNet)
   evaluate_2_Images2::Attr(evaluate, Images)
   evaluate_3_Accuracy3::Attr(evaluate, Accuracy)
   evaluate_4_Metadata4::Attr(evaluate, Metadata)
end;
```

```julia
using AlgebraicRelations.DB
using SQLite

@present WorkplaceSchema <: TheorySQL begin
    # Data tables
    employee::Ob
    emp_data::Attr(employee, Int)

    name::Ob
    name_data::Attr(name, String)

    salary::Ob
    sal_data::Attr(salary, Real)

    # Relation tables
    manager::Ob
    emplm::Hom(manager, employee)
    manag::Hom(manager, employee)

    full_name::Ob
    empln::Hom(full_name, employee)
    namen::Hom(full_name, name)

    income::Ob
    empli::Hom(income, employee)
    sali::Hom(income, salary)
end
```
