const AuthLayout = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen flex bg-white overflow-hidden">


      {/* LADO IZQUIERDO */}
      <div className="
        relative
        hidden
        lg:flex
        lg:w-[45%]
        xl:w-[42%]
        overflow-hidden
        bg-white
      ">


        <div
          className="absolute rounded-full"
          style={{
            width: "130%",
            paddingBottom: "130%",
            top: "-30%",
            left: "-30%",
            background:
              "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)",
          }}
        >


          <div className="
            absolute
            inset-0
            flex
            flex-col
            justify-center
            items-center
            px-16
            pt-[18%]
          ">


            <div className="
              text-white
              max-w-[280px]
              text-center
            ">


              <h1 className="
                text-4xl
                font-extrabold
                tracking-tight
                leading-tight
              ">

                {title}

              </h1>


              <p className="
                mt-4
                text-sm
                text-white/75
                leading-relaxed
              ">

                {subtitle}

              </p>


            </div>


          </div>


        </div>



        {/* CIRCULO ABAJO */}
        <div
          className="absolute rounded-full"
          style={{
            width:"75%",
            paddingBottom:"75%",
            bottom:"-20%",
            left:"-20%",
            background:
            "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)"
          }}
        />



        {/* CIRCULO PEQUEÑO */}
        <div
          className="absolute rounded-full"
          style={{
            width:"32%",
            paddingBottom:"32%",
            bottom:"12%",
            right:"8%",
            background:
            "radial-gradient(circle at center, #5B8FE0 0%, #4A7FD4 40%, #2D5BB5 75%, #1E4BAD 100%)"
          }}
        />


      </div>





      {/* LADO DERECHO */}
      <div className="
        flex-1
        flex
        flex-col
        justify-between
        px-8
        sm:px-14
        py-10
      ">


        <div className="
          flex-1
          flex
          flex-col
          justify-center
          items-center
        ">


          <div className="
            w-full
            max-w-[400px]
          ">


            {children}


          </div>


        </div>


      </div>



    </div>
  );
};


export default AuthLayout;