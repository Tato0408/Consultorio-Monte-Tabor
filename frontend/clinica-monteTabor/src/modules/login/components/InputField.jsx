const InputField = ({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  error,
}) => {

  return (
    <div className="flex flex-col gap-2">

      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700"
      >
        {label}
      </label>


      <div className="relative">


        {
          icon && (

            <div className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-gray-400
            ">

              {icon}

            </div>

          )
        }



        <input

          id={id}

          type={type}

          placeholder={placeholder}

          value={value}

          onChange={onChange}


          className={`
            w-full
            h-12
            rounded-lg
            border
            px-4
            ${icon ? "pl-10" : ""}
            text-gray-900
            outline-none
            transition

            ${
              error
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 focus:border-blue-500"
            }

          `}

        />


      </div>



      {
        error && (

          <p className="text-sm text-red-500">
            {error}
          </p>

        )
      }


    </div>
  );
};


export default InputField;